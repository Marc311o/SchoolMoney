from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import Select, delete, func, select
from sqlalchemy.orm import Session

from app.modules.children.models import Child
from app.modules.children.schemas import ChildClassRead, ChildCreate, ChildRead, ChildUpdate
from app.modules.classrooms.enums import MembershipStatus
from app.modules.classrooms.models import ChildClassMembership, SchoolClass
from app.modules.fundraisers.enums import FundraiserStatus
from app.modules.fundraisers.models import Fundraiser, FundraiserObligation, FundraiserPayment
from app.modules.users.models import User

CURRENT_MEMBERSHIP = (MembershipStatus.ACTIVE, MembershipStatus.PENDING)


def active_children_query() -> Select[tuple[Child]]:
    """Children that were not removed. Use this everywhere except history and reports."""
    return select(Child).where(Child.deleted_at.is_(None))


def _to_read(db: Session, child: Child) -> ChildRead:
    row = db.execute(
        select(SchoolClass.id, SchoolClass.name, ChildClassMembership.status)
        .join(ChildClassMembership, ChildClassMembership.class_id == SchoolClass.id)
        .where(
            ChildClassMembership.child_id == child.id,
            ChildClassMembership.status.in_(CURRENT_MEMBERSHIP),
        )
    ).first()
    school_class = ChildClassRead(id=row.id, name=row.name, status=row.status) if row else None
    return ChildRead.model_validate(child).model_copy(update={"school_class": school_class})


def get_own_child(db: Session, user: User, child_id: UUID) -> Child:
    """The parent's own, not removed child. Anything else is a 404, so ids cannot be probed."""
    child = db.scalar(
        active_children_query().where(Child.id == child_id, Child.parent_id == user.id)
    )
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    return child


def list_children(db: Session, user: User) -> list[ChildRead]:
    children = db.scalars(
        active_children_query().where(Child.parent_id == user.id).order_by(Child.created_at)
    )
    return [_to_read(db, child) for child in children]


def get_child(db: Session, user: User, child_id: UUID) -> ChildRead:
    return _to_read(db, get_own_child(db, user, child_id))


def create_child(db: Session, user: User, data: ChildCreate) -> ChildRead:
    # Re-adding a removed child (same name and birth date) brings the old one back
    removed = db.scalar(
        select(Child)
        .where(
            Child.parent_id == user.id,
            Child.deleted_at.is_not(None),
            func.lower(Child.first_name) == data.first_name.lower(),
            func.lower(Child.last_name) == data.last_name.lower(),
            Child.birth_date == data.birth_date,
        )
        .order_by(Child.deleted_at.desc())
    )

    if removed is not None:
        removed.deleted_at = None
        removed.first_name = data.first_name
        removed.last_name = data.last_name
        if data.avatar_url is not None:
            removed.avatar_url = data.avatar_url
        child = removed
    else:
        child = Child(id=uuid4(), parent_id=user.id, **data.model_dump())
        db.add(child)

    db.commit()
    db.refresh(child)
    return _to_read(db, child)


def update_child(db: Session, user: User, child_id: UUID, data: ChildUpdate) -> ChildRead:
    child = get_own_child(db, user, child_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(child, field, value)
    db.commit()
    db.refresh(child)
    return _to_read(db, child)


def remove_child(db: Session, user: User, child_id: UUID) -> None:
    """Archive the child (soft delete). History stays; the child disappears for the parent.

    1. Blocked while the child has a payment in an open fundraiser (409).
    2. Unpaid obligations in open and draft fundraisers are deleted.
    3. Current class membership (active or pending) becomes LEFT.
    """
    child = get_own_child(db, user, child_id)
    now = datetime.now(UTC)

    blocking = db.scalars(
        select(Fundraiser.name)
        .join(FundraiserPayment, FundraiserPayment.fundraiser_id == Fundraiser.id)
        .where(
            FundraiserPayment.child_id == child.id,
            FundraiserPayment.refunded_at.is_(None),
            Fundraiser.status == FundraiserStatus.ACTIVE,
        )
        .distinct()
    ).all()
    if blocking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Child has payments in open fundraisers: {', '.join(sorted(blocking))}",
        )

    open_fundraisers = select(Fundraiser.id).where(
        Fundraiser.status.in_((FundraiserStatus.ACTIVE, FundraiserStatus.DRAFT))
    )
    db.execute(
        delete(FundraiserObligation).where(
            FundraiserObligation.child_id == child.id,
            FundraiserObligation.fundraiser_id.in_(open_fundraisers),
        )
    )

    for membership in db.scalars(
        select(ChildClassMembership).where(
            ChildClassMembership.child_id == child.id,
            ChildClassMembership.status.in_(CURRENT_MEMBERSHIP),
        )
    ):
        membership.status = MembershipStatus.LEFT
        membership.left_at = now

    child.deleted_at = now
    db.commit()
