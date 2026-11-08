"""remove amount from fundraiser payments

Revision ID: 83fe25c39f45
Revises: d733055c589c
Create Date: 2026-11-08 11:48:43.921285

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "83fe25c39f45"
down_revision: str | Sequence[str] | None = "d733055c589c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("fundraiser_payments", "amount")


def downgrade() -> None:
    op.add_column(
        "fundraiser_payments",
        sa.Column("amount", sa.Numeric(12, 2), nullable=True),
    )
    op.execute("""
               UPDATE fundraiser_payments AS p
               SET amount = t.amount FROM transactions AS t
               WHERE t.id = p.transaction_id
               """)
    op.alter_column("fundraiser_payments", "amount", nullable=False)
