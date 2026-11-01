from collections import defaultdict
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, contains_eager

from app.modules.children.models import Child
from app.modules.classrooms.enums import ClassRole, MembershipStatus
from app.modules.classrooms.models import ChildClassMembership, SchoolClass
from app.modules.classrooms.schemas import (
    ClassDetailRead,
    ClassListItemRead,
    ClassMemberRead,
    ClassMemberWithParentRead,
    SchoolClassCreate,
    SchoolClassRead,
)
from app.modules.users.models import User
from app.modules.users.schemas import UserSummaryRead

CURRENT_MEMBERSHIP = (MembershipStatus.ACTIVE, MembershipStatus.PENDING)


def _class_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")


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
            select(ChildClassMembership.id)
            .join(Child, Child.id == ChildClassMembership.child_id)
            .where(
                ChildClassMembership.class_id == class_id,
                ChildClassMembership.status == MembershipStatus.ACTIVE,
                Child.parent_id == user.id,
                Child.deleted_at.is_(None),
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
    """Create a class owned by the current user, who becomes its treasurer."""
    school_class = SchoolClass(
        id=uuid4(),
        name=payload.name,
        school_name=payload.school_name,
        treasurer_id=user.id,
    )

    db.add(school_class)
    db.commit()
    db.refresh(school_class)

    return SchoolClassRead.model_validate(school_class)
