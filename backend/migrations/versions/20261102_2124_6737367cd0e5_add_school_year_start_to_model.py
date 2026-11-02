"""Add school year start to model

Revision ID: 6737367cd0e5
Revises: bb918a7aa386
Create Date: 2026-11-02 21:24:16.974492

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6737367cd0e5"
down_revision: str | Sequence[str] | None = "bb918a7aa386"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "classes",
        sa.Column(
            "school_year_start",
            sa.SmallInteger(),
            nullable=True,
        ),
    )

    op.create_check_constraint(
        op.f("ck_classes_school_year_start_valid"),
        "classes",
        "school_year_start IS NULL OR school_year_start BETWEEN 1 AND 9998",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("ck_classes_school_year_start_valid"),
        "classes",
        type_="check",
    )

    op.drop_column("classes", "school_year_start")
    # ### end Alembic commands ###
