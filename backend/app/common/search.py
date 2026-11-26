from sqlalchemy.sql.elements import ColumnElement


def escape_like(value: str) -> str:
    """Escape SQL LIKE/ILIKE wildcards (\\, %, _) so user input matches literally."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def contains_ilike(column: ColumnElement[str], value: str) -> ColumnElement[bool]:
    """Case-insensitive substring match with SQL LIKE wildcards safely escaped."""
    return column.ilike(f"%{escape_like(value)}%", escape="\\")
