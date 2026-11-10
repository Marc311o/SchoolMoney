import math
from collections import defaultdict
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.common.schemas import Page
from app.modules.admin.schemas import AdminUserRead
from app.modules.children.models import Child
from app.modules.children.schemas import ChildSummaryRead
from app.modules.classrooms.models import SchoolClass
from app.modules.classrooms.schemas import SchoolClassRead
from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from app.modules.users.schemas import UserRead, UserStatusUpdate


def _paginate(db: Session, statement: Select, page: int, page_size: int) -> tuple[list, int]:
    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    rows = list(db.scalars(statement.offset((page - 1) * page_size).limit(page_size)))
    return rows, total


def _user_rows(db: Session, users: list[User]) -> list[AdminUserRead]:
    """Children and treasurer classes for a page of users, in two queries."""
    ids = [user.id for user in users]
    children: dict[UUID, list[ChildSummaryRead]] = defaultdict(list)
    for child in db.scalars(
        select(Child)
        .where(Child.parent_id.in_(ids), Child.deleted_at.is_(None))
        .order_by(Child.first_name, Child.last_name)
    ):
        children[child.parent_id].append(ChildSummaryRead.model_validate(child))
    classes: dict[UUID, list[SchoolClassRead]] = defaultdict(list)
    for school_class in db.scalars(
        select(SchoolClass).where(SchoolClass.treasurer_id.in_(ids)).order_by(SchoolClass.name)
    ):
        classes[school_class.treasurer_id].append(SchoolClassRead.model_validate(school_class))

    return [
        AdminUserRead(
            **UserRead.model_validate(user).model_dump(),
            children=children[user.id],
            classes=classes[user.id],
        )
        for user in users
    ]


def list_users(
    db: Session,
    *,
    query: str | None,
    user_status: UserStatus | None,
    treasurers_only: bool,
    page: int,
    page_size: int,
) -> Page[AdminUserRead]:
    """Parents only: administrators manage each other elsewhere, if at all."""
    statement = select(User).where(User.role == UserRole.PARENT)

    if query and query.strip():
        needle = f"%{query.strip()}%"
        statement = statement.where(
            or_(
                func.concat(User.first_name, " ", User.last_name).ilike(needle),
                User.email.ilike(needle),
            )
        )
    if user_status is not None:
        statement = statement.where(User.status == user_status)
    if treasurers_only:
        statement = statement.where(
            select(SchoolClass.id).where(SchoolClass.treasurer_id == User.id).exists()
        )

    users, total = _paginate(
        db,
        statement.order_by(User.last_name, User.first_name, User.id),
        page,
        page_size,
    )
    return Page[AdminUserRead](
        items=_user_rows(db, users),
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size),
    )


def set_user_status(db: Session, user_id: UUID, data: UserStatusUpdate) -> AdminUserRead:
    """Block or unblock a parent. Takes effect on their very next request."""
    if data.status not in (UserStatus.ACTIVE, UserStatus.BLOCKED):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Status can only be ACTIVE or BLOCKED",
        )

    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators cannot be blocked",
        )
    if user.status == UserStatus.PENDING_ACTIVATION:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account is not activated yet",
        )

    user.status = data.status
    db.flush()
    [row] = _user_rows(db, [user])
    db.commit()
    return row
