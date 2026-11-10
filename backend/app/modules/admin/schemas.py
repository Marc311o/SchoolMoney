from app.modules.classrooms.schemas import SchoolClassRead
from app.modules.users.schemas import UserRead


class AdminUserRead(UserRead):
    """A row of the admin's Users / Treasurers table."""

    children_count: int
    classes: list[SchoolClassRead]  # classes this user runs as treasurer
