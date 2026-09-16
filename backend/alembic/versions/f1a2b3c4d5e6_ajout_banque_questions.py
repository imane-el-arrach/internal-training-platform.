"""ajout banque de questions réutilisables"""

from alembic import op
import sqlalchemy as sa

revision = "f1a2b3c4d5e6"
down_revision = "e2f1a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "questions_banque",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("enonce", sa.Text(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("cree_par", sa.UUID(), nullable=True),
        sa.Column("date_creation", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["cree_par"], ["utilisateurs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "reponses_banque",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("question_banque_id", sa.UUID(), nullable=False),
        sa.Column("texte", sa.String(length=500), nullable=False),
        sa.Column("est_correcte", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("ordre", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["question_banque_id"], ["questions_banque.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_banque_id", "ordre", name="uq_reponse_banque_ordre"),
    )


def downgrade() -> None:
    op.drop_table("reponses_banque")
    op.drop_table("questions_banque")
