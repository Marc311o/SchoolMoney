"""Deleted amount pr child from fundraiser obligation

Revision ID: d733055c589c
Revises: b98a0cea1fa8
Create Date: 2026-11-08 11:17:53.371012

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d733055c589c"
down_revision: str | Sequence[str] | None = "b98a0cea1fa8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("fundraiser_obligations", "required_amount_per_child")


def downgrade() -> None:
    op.add_column(
        "fundraiser_obligations",
        sa.Column("required_amount_per_child", sa.Numeric(12, 2), nullable=True),
    )
    op.execute("""
        UPDATE fundraiser_obligations AS o
        SET required_amount_per_child = f.required_amount_per_child
        FROM fundraisers AS f
        WHERE f.id = o.fundraiser_id
    """)
    op.alter_column("fundraiser_obligations", "required_amount_per_child", nullable=False)
