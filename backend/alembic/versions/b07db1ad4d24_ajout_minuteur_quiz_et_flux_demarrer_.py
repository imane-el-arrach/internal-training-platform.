"""ajout minuteur quiz et flux demarrer/soumettre

Revision ID: b07db1ad4d24
Revises: 5866dcc8a1bb
Create Date: 2026-08-11 13:22:59.724382

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

revision = 'b07db1ad4d24'
down_revision = '5866dcc8a1bb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Créer le type ENUM PostgreSQL avant d'ajouter la colonne
    statut_tentative = postgresql.ENUM(
        "en_cours",
        "terminee",
        name="statut_tentative",
    )
    statut_tentative.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "questionnaires",
        sa.Column(
            "temps_limite_secondes",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "tentatives",
        sa.Column(
            "statut",
            statut_tentative,
            server_default="en_cours",
            nullable=False,
        ),
    )

    op.add_column(
        "tentatives",
        sa.Column(
            "hors_delai",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.alter_column(
        "tentatives",
        "score",
        existing_type=sa.INTEGER(),
        nullable=True,
    )

    op.alter_column(
        "tentatives",
        "reussi",
        existing_type=sa.BOOLEAN(),
        nullable=True,
    )

    op.alter_column(
        "tentatives",
        "date_passage",
        existing_type=postgresql.TIMESTAMP(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "tentatives",
        "date_passage",
        existing_type=postgresql.TIMESTAMP(),
        nullable=False,
    )

    op.alter_column(
        "tentatives",
        "reussi",
        existing_type=sa.BOOLEAN(),
        nullable=False,
    )

    op.alter_column(
        "tentatives",
        "score",
        existing_type=sa.INTEGER(),
        nullable=False,
    )

    op.drop_column("tentatives", "hors_delai")
    op.drop_column("tentatives", "statut")
    op.drop_column("questionnaires", "temps_limite_secondes")

    # Supprimer le type ENUM PostgreSQL
    statut_tentative = postgresql.ENUM(
        "en_cours",
        "terminee",
        name="statut_tentative",
    )
    statut_tentative.drop(op.get_bind(), checkfirst=True)
