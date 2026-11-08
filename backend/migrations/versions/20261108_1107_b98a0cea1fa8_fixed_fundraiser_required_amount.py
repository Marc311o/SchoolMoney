"""fixed fundraiser required amount

Revision ID: b98a0cea1fa8
Revises: 6737367cd0e5
Create Date: 2026-11-08 11:07:33.085750

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b98a0cea1fa8"
down_revision: str | Sequence[str] | None = "6737367cd0e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("fundraisers", "required_amount", new_column_name="required_amount_per_child")
    op.execute("ALTER TYPE transaction_type ADD VALUE 'FUNDRAISER_FUNDING'")


def downgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM transactions WHERE type = 'FUNDRAISER_FUNDING') THEN
                RAISE EXCEPTION 'Cannot downgrade with inter-fund transfers in the ledger';
            END IF;
        END; $$
    """)
    op.execute("ALTER TYPE transaction_type RENAME TO transaction_type_with_funding")
    op.execute("""
        CREATE TYPE transaction_type AS ENUM (
            'TOP_UP', 'EXTERNAL_TRANSFER', 'FUNDRAISER_PAYMENT', 'PAYMENT_REFUND',
            'TREASURER_WITHDRAWAL', 'TREASURER_DEPOSIT', 'CLOSE_REFUND'
        )
    """)
    op.execute("""
               ALTER TABLE transactions ALTER COLUMN type TYPE transaction_type
        USING type::text::transaction_type
               """)
    op.execute("DROP TYPE transaction_type_with_funding")
    op.alter_column("fundraisers", "required_amount_per_child", new_column_name="required_amount")
