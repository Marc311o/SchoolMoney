from decimal import Decimal
from typing import Annotated, TypeVar

from pydantic import BaseModel, ConfigDict, Field


class SchemaBase(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        extra="forbid",
    )


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
