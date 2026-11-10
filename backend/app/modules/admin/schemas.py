from app.modules.children.schemas import ChildSummaryRead
from app.modules.classrooms.schemas import SchoolClassRead
from app.modules.users.schemas import UserRead


class AdminUserRead(UserRead):
    """A row of the admin's Users / Treasurers table."""

    children: list[ChildSummaryRead]
    classes: list[SchoolClassRead]  # classes this user runs as treasurer
