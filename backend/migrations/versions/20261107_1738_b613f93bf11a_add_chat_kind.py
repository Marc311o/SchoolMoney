"""add chat kind

Revision ID: b613f93bf11a
Revises: 6737367cd0e5
Create Date: 2026-11-07 17:38:56.037703

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b613f93bf11a"
down_revision: str | Sequence[str] | None = "6737367cd0e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

chat_kind = sa.Enum("CLASS", "DIRECT", "ADMIN", name="chat_kind")


def upgrade() -> None:
    chat_kind.create(op.get_bind())
    op.add_column("chats", sa.Column("kind", chat_kind, nullable=True))
    op.execute(
        """
        UPDATE chats SET kind = CASE
            WHEN class_id IS NOT NULL THEN 'CLASS'::chat_kind
            WHEN EXISTS (
                SELECT 1 FROM chat_participants p JOIN users u ON u.id = p.user_id
                WHERE p.chat_id = chats.id AND u.role = 'ADMIN'
            ) THEN 'ADMIN'::chat_kind
            ELSE 'DIRECT'::chat_kind
        END
        """
    )
    op.alter_column("chats", "kind", nullable=False)

    op.create_check_constraint(
        op.f("ck_chats_class_id_matches_kind"),
        "chats",
        "(kind = 'CLASS') = (class_id IS NOT NULL)",
    )
    op.create_index(
        "uq_chats_one_per_class",
        "chats",
        ["class_id"],
        unique=True,
        postgresql_where=sa.text("kind = 'CLASS'"),
    )
    op.create_index("ix_messages_chat_id_created_at", "messages", ["chat_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_messages_chat_id_created_at", table_name="messages")
    op.drop_index("uq_chats_one_per_class", table_name="chats")
    op.drop_constraint(op.f("ck_chats_class_id_matches_kind"), "chats", type_="check")
    op.drop_column("chats", "kind")
    chat_kind.drop(op.get_bind())
