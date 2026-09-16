"""statuts ingestion et progression contenus"""

from alembic import op
import sqlalchemy as sa


revision = "e2f1a3b4c5d6"
down_revision = "c804c65a66a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    statut_ingestion = sa.Enum(
        "en_attente",
        "en_cours",
        "terminee",
        "echec",
        "non_indexable",
        name="statut_ingestion",
    )
    statut_ingestion.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "contenus",
        sa.Column(
            "statut_ingestion",
            statut_ingestion,
            nullable=False,
            server_default="en_attente",
        ),
    )
    op.add_column("contenus", sa.Column("date_indexation", sa.DateTime(), nullable=True))
    op.add_column(
        "contenus",
        sa.Column("erreur_ingestion", sa.String(length=1000), nullable=True),
    )

    op.create_table(
        "progressions_contenus",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("utilisateur_id", sa.UUID(), nullable=False),
        sa.Column("contenu_id", sa.UUID(), nullable=False),
        sa.Column("date_completion", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["utilisateur_id"],
            ["utilisateurs.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["contenu_id"],
            ["contenus.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "utilisateur_id",
            "contenu_id",
            name="uq_progression_contenu_utilisateur",
        ),
    )


def downgrade() -> None:
    op.drop_table("progressions_contenus")
    op.drop_column("contenus", "erreur_ingestion")
    op.drop_column("contenus", "date_indexation")
    op.drop_column("contenus", "statut_ingestion")

    statut_ingestion = sa.Enum(name="statut_ingestion")
    statut_ingestion.drop(op.get_bind(), checkfirst=True)