from collections import defaultdict
from datetime import UTC, datetime
from secrets import token_urlsafe
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, contains_eager

from app.modules.auth.mailer import EmailDeliveryError
from app.modules.children.models import Child
from app.modules.children.service import active_children_query
from app.modules.classrooms.enums import ClassRole, MembershipStatus
from app.modules.classrooms.mailer import send_class_invite_email
from app.modules.classrooms.models import ChildClassMembership, ClassAccessCode, SchoolClass
from app.modules.classrooms.schemas import (
    ChildClassMembershipRead,
    ClassAccessCodeCreate,
    ClassAccessCodeRead,
    ClassDetailRead,
    ClassInviteCreate,
    ClassInviteDetailsRead,
    ClassInviteSentRead,
    ClassJoinRequest,
    ClassListItemRead,
    ClassMemberRead,
    ClassMemberWithParentRead,
    MembershipReviewRequest,
    SchoolClassCreate,
    SchoolClassRead,
)
from app.modules.users.enums import UserStatus
from app.modules.users.models import User
from app.modules.users.schemas import UserSummaryRead

CURRENT_MEMBERSHIP = (MembershipStatus.ACTIVE, MembershipStatus.PENDING)


def _class_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")


def active_class_children_query() -> Select[tuple[Child]]:
    return (
        active_children_query()
        .join(ChildClassMembership, ChildClassMembership.child_id == Child.id)
        .where(ChildClassMembership.status == MembershipStatus.ACTIVE)
    )


def list_classes(db: Session, user: User) -> list[ClassListItemRead]:
    """Classes I run as treasurer, plus classes my children are in or waiting to join."""
    my_memberships = db.scalars(
        select(ChildClassMembership)
        .join(ChildClassMembership.child)
        .options(contains_eager(ChildClassMembership.child))
        .where(
            Child.parent_id == user.id,
            Child.deleted_at.is_(None),
            ChildClassMembership.status.in_(CURRENT_MEMBERSHIP),
        )
        .order_by(Child.first_name)
    ).all()

    my_children: dict[UUID, list[ClassMemberRead]] = defaultdict(list)
    for membership in my_memberships:
        my_children[membership.class_id].append(ClassMemberRead.model_validate(membership))

    rows = db.execute(
        select(SchoolClass, User)
        .join(User, User.id == SchoolClass.treasurer_id)
        .where((SchoolClass.treasurer_id == user.id) | SchoolClass.id.in_(list(my_children)))
        .order_by(SchoolClass.name)
    ).all()

    counts = dict(
        db.execute(
            select(ChildClassMembership.class_id, func.count())
            .join(Child, Child.id == ChildClassMembership.child_id)
            .where(
                ChildClassMembership.class_id.in_([school_class.id for school_class, _ in rows]),
                ChildClassMembership.status == MembershipStatus.ACTIVE,
                Child.deleted_at.is_(None),
            )
            .group_by(ChildClassMembership.class_id)
        ).all()
    )

    return [
        ClassListItemRead(
            **dict(SchoolClassRead.model_validate(school_class)),
            my_role=ClassRole.TREASURER
            if school_class.treasurer_id == user.id
            else ClassRole.PARENT,
            treasurer=UserSummaryRead.model_validate(treasurer),
            my_children=my_children.get(school_class.id, []),
            children_count=counts.get(school_class.id, 0),
        )
        for school_class, treasurer in rows
    ]


def get_class(db: Session, user: User, class_id: UUID) -> ClassDetailRead:
    """Only the treasurer and parents with an ACTIVE child see the class.

    Anyone else gets a 404 (also a parent still waiting for approval), so ids cannot be probed.
    """
    school_class = db.get(SchoolClass, class_id)
    if school_class is None:
        raise _class_not_found()

    is_treasurer = school_class.treasurer_id == user.id
    if not is_treasurer:
        has_active_child = db.scalar(
            active_class_children_query()
            .with_only_columns(Child.id)
            .where(
                ChildClassMembership.class_id == class_id,
                Child.parent_id == user.id,
            )
            .limit(1)
        )
        if has_active_child is None:
            raise _class_not_found()

    visible = CURRENT_MEMBERSHIP if is_treasurer else (MembershipStatus.ACTIVE,)
    rows = db.execute(
        select(ChildClassMembership, User)
        .join(ChildClassMembership.child)
        .join(User, User.id == Child.parent_id)
        .options(contains_eager(ChildClassMembership.child))
        .where(
            ChildClassMembership.class_id == class_id,
            ChildClassMembership.status.in_(visible),
            Child.deleted_at.is_(None),
        )
        .order_by(Child.last_name, Child.first_name)
    ).all()

    return ClassDetailRead(
        **dict(SchoolClassRead.model_validate(school_class)),
        my_role=ClassRole.TREASURER if is_treasurer else ClassRole.PARENT,
        treasurer=UserSummaryRead.model_validate(db.get(User, school_class.treasurer_id)),
        children=[
            ClassMemberWithParentRead(
                **dict(ClassMemberRead.model_validate(membership)),
                parent=UserSummaryRead.model_validate(parent),
            )
            for membership, parent in rows
        ],
    )


def create_class(
    db: Session,
    user: User,
    payload: SchoolClassCreate,
) -> SchoolClassRead:
    school_year_start = int(payload.school_year.split("/")[0]) if payload.school_year else None

    name = f"{payload.name}_{payload.school_year}" if payload.append_school_year else payload.name

    school_class = SchoolClass(
        id=uuid4(),
        name=name,
        school_year_start=school_year_start,
        school_name=payload.school_name,
        treasurer_id=user.id,
    )

    db.add(school_class)
    db.commit()
    db.refresh(school_class)

    return SchoolClassRead.model_validate(school_class)


def require_treasurer(
    db: Session, user: User, class_id: UUID, *, lock: bool = False
) -> SchoolClass:
    statement = select(SchoolClass).where(
        SchoolClass.id == class_id,
        SchoolClass.treasurer_id == user.id,
    )

    if lock:
        statement = statement.with_for_update()

    school_class = db.scalar(statement)

    if school_class is None:
        raise _class_not_found()

    return school_class


def get_access_code(db: Session, user: User, class_id: UUID) -> ClassAccessCodeRead | None:
    require_treasurer(db, user, class_id)

    access_code = db.scalar(
        select(ClassAccessCode)
        .where(
            ClassAccessCode.class_id == class_id,
            ClassAccessCode.active.is_(True),
            (ClassAccessCode.valid_until.is_(None))
            | (ClassAccessCode.valid_until > datetime.now(UTC)),
        )
        .order_by(ClassAccessCode.created_at.desc(), ClassAccessCode.id.desc())
        .limit(1)
    )

    return ClassAccessCodeRead.model_validate(access_code) if access_code else None


def regenerate_access_code(
    db: Session, user: User, class_id: UUID, data: ClassAccessCodeCreate
) -> ClassAccessCodeRead:
    require_treasurer(db, user, class_id, lock=True)

    db.execute(
        update(ClassAccessCode)
        .where(
            ClassAccessCode.class_id == class_id,
            ClassAccessCode.active.is_(True),
        )
        .values(active=False)
    )

    for _ in range(5):
        candidate = token_urlsafe(16)

        try:
            # A collision rolls back only this insert.
            with db.begin_nested():
                access_code = ClassAccessCode(
                    id=uuid4(),
                    class_id=class_id,
                    code=candidate,
                    valid_until=data.valid_until,
                    active=True,
                )
                db.add(access_code)
                db.flush()

        except IntegrityError:
            if db.scalar(select(ClassAccessCode.id).where(ClassAccessCode.code == candidate)):
                continue

            raise

        else:
            db.commit()
            db.refresh(access_code)
            return ClassAccessCodeRead.model_validate(access_code)

    # Restore the previous code if generation fails.
    db.rollback()

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Could not generate an access code. Please try again.",
    )


def join_class(
    db: Session,
    user: User,
    payload: ClassJoinRequest,
) -> ChildClassMembershipRead:
    """Request to join a class via an active access code."""
    access_code = db.scalar(
        select(ClassAccessCode).where(
            ClassAccessCode.code == payload.code,
            ClassAccessCode.active.is_(True),
            (ClassAccessCode.valid_until.is_(None))
            | (ClassAccessCode.valid_until > datetime.now(UTC)),
        )
    )
    if access_code is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired access code",
        )

    child = db.scalar(
        select(Child).where(
            Child.id == payload.child_id,
            Child.parent_id == user.id,
            Child.deleted_at.is_(None),
        )
    )
    if child is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found",
        )

    current_membership = db.scalar(
        select(ChildClassMembership).where(
            ChildClassMembership.child_id == child.id,
            ChildClassMembership.status.in_(CURRENT_MEMBERSHIP),
        )
    )
    if current_membership is not None:
        if current_membership.class_id == access_code.class_id:
            detail = (
                "Child is already a member of this class"
                if current_membership.status == MembershipStatus.ACTIVE
                else "Join request is already pending"
            )
        else:
            detail = "Child already belongs to or has a pending request in another class"

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )

    existing_membership = db.scalar(
        select(ChildClassMembership).where(
            ChildClassMembership.child_id == child.id,
            ChildClassMembership.class_id == access_code.class_id,
        )
    )

    now = datetime.now(UTC)
    if existing_membership is not None:
        existing_membership.status = MembershipStatus.PENDING
        existing_membership.requested_at = now
        existing_membership.left_at = None
        db.commit()
        db.refresh(existing_membership)
        return ChildClassMembershipRead.model_validate(existing_membership)

    membership = ChildClassMembership(
        id=uuid4(),
        child_id=child.id,
        class_id=access_code.class_id,
        status=MembershipStatus.PENDING,
        requested_at=now,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)

    return ChildClassMembershipRead.model_validate(membership)


def review_membership(
    db: Session,
    user: User,
    class_id: UUID,
    membership_id: UUID,
    payload: MembershipReviewRequest,
) -> ChildClassMembershipRead:
    """Approve (ACTIVE) or reject (REJECTED) a pending join request. Treasurer only."""
    require_treasurer(db, user, class_id)

    membership = db.scalar(
        select(ChildClassMembership).where(
            ChildClassMembership.id == membership_id,
            ChildClassMembership.class_id == class_id,
        )
    )
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership request not found",
        )

    if membership.status != MembershipStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot review membership with status {membership.status.value}",
        )

    now = datetime.now(UTC)
    membership.status = payload.status

    if payload.status == MembershipStatus.ACTIVE:
        membership.joined_at = now
        membership.left_at = None
    elif payload.status == MembershipStatus.REJECTED:
        membership.left_at = now

    db.commit()
    db.refresh(membership)

    return ChildClassMembershipRead.model_validate(membership)


def remove_membership(
    db: Session,
    user: User,
    class_id: UUID,
    membership_id: UUID,
) -> ChildClassMembershipRead:
    membership = db.scalar(
        select(ChildClassMembership)
        .join(ChildClassMembership.school_class)
        .join(ChildClassMembership.child)
        .where(
            ChildClassMembership.id == membership_id,
            ChildClassMembership.class_id == class_id,
            (SchoolClass.treasurer_id == user.id) | (Child.parent_id == user.id),
        )
        .with_for_update(of=ChildClassMembership)
        .execution_options(populate_existing=True)
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found",
        )

    if membership.status != MembershipStatus.LEFT:
        if membership.status not in CURRENT_MEMBERSHIP:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only active or pending memberships can be removed",
            )

        membership.status = MembershipStatus.LEFT
        membership.left_at = datetime.now(UTC)

    db.commit()
    db.refresh(membership)

    return ChildClassMembershipRead.model_validate(membership)


def get_invite_details(db: Session, code: str) -> ClassInviteDetailsRead:
    """Resolve an invite code/token and return basic class information."""
    access_code = db.scalar(
        select(ClassAccessCode).where(
            ClassAccessCode.code == code,
            ClassAccessCode.active.is_(True),
            (ClassAccessCode.valid_until.is_(None))
            | (ClassAccessCode.valid_until > datetime.now(UTC)),
        )
    )
    if access_code is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invite link",
        )

    school_class = db.get(SchoolClass, access_code.class_id)
    if school_class is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )

    treasurer = db.get(User, school_class.treasurer_id)
    treasurer_name = (
        f"{treasurer.first_name} {treasurer.last_name}" if treasurer else "Unknown Treasurer"
    )

    return ClassInviteDetailsRead(
        class_id=school_class.id,
        class_name=school_class.name,
        school_name=school_class.school_name,
        treasurer_name=treasurer_name,
        code=access_code.code,
    )


def send_class_invite(
    db: Session,
    user: User,
    class_id: UUID,
    payload: ClassInviteCreate,
) -> ClassInviteSentRead:
    """Send an invitation email to a parent. Treasurer only."""

    school_class = require_treasurer(db, user, class_id)

    # Find the selected parent.
    parent = db.scalar(
        select(User).where(
            User.id == payload.parent_id,
            User.status == UserStatus.ACTIVE,
        )
    )

    if parent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent not found",
        )

    # Do not invite the treasurer
    if parent.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot invite yourself",
        )

    # Find the currently active access code.
    now = datetime.now(UTC)

    access_code = db.scalar(
        select(ClassAccessCode)
        .where(
            ClassAccessCode.class_id == class_id,
            ClassAccessCode.active.is_(True),
            (ClassAccessCode.valid_until.is_(None)) | (ClassAccessCode.valid_until > now),
        )
        .order_by(
            ClassAccessCode.created_at.desc(),
            ClassAccessCode.id.desc(),
        )
        .limit(1)
    )

    if access_code is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Class has no active access code",
        )

    treasurer_name = f"{user.first_name} {user.last_name}"

    # Send email
    try:
        send_class_invite_email(
            recipient=parent.email,
            class_name=school_class.name,
            school_name=school_class.school_name,
            treasurer_name=treasurer_name,
            access_code=access_code.code,
        )
    except EmailDeliveryError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not deliver invitation email",
        ) from None

    return ClassInviteSentRead(
        message="Invitation email sent successfully",
        class_id=class_id,
        parent_id=parent.id,
        email=parent.email,
        sent_at=now,
    )
