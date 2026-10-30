from decimal import Decimal
from typing import Annotated, Any, TypeVar

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class SchemaBase(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        extra="forbid",
    )


FirstName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
LastName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
AvatarUrl = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
]


def reject_explicit_nulls(data: Any, fields: tuple[str, ...]) -> Any:
    """PATCH helper: omitted is allowed, explicit null is not for DB NOT NULL fields."""
    if isinstance(data, dict):
        for field in fields:
            if field in data and data[field] is None:
                raise ValueError(f"{field} cannot be null")
    return data


Money = Annotated[
    Decimal,
    Field(max_digits=12, decimal_places=2),
]

PositiveMoney = Annotated[
    Decimal,
    Field(gt=0, max_digits=12, decimal_places=2),
]

NonNegativeMoney = Annotated[
    Decimal,
    Field(ge=0, max_digits=12, decimal_places=2),
]


class MessageResponse(SchemaBase):
    message: str


T = TypeVar("T")


class Page[T](SchemaBase):
    items: list[T]
    total: int = Field(ge=0)
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)
