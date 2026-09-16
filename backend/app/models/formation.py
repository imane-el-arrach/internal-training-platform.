import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class Formation(SQLModel, table=True):
    __tablename__ = "formations"
    __table_args__ = (
        CheckConstraint(
            "duree_estimee_minutes IS NULL OR duree_estimee_minutes > 0",
            name="chk_duree_formation",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    titre: str = Field(max_length=255, nullable=False)
    description: str | None = None

    # RESTRICT : on ne peut pas supprimer une catégorie tant que des
    # formations y sont rattachées (cf. route supprimer_categorie).
    categorie_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("categories.id", ondelete="RESTRICT"),
            nullable=False,
        )
    )

    obligatoire: bool = Field(default=False, nullable=False)
    actif: bool = Field(default=True, nullable=False)
    duree_estimee_minutes: int | None = None

    # SET NULL : si le compte admin créateur est désactivé/supprimé un jour,
    # la formation reste, seule la trace de son créateur s'efface.
    cree_par: uuid.UUID | None = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("utilisateurs.id", ondelete="SET NULL"),
            nullable=True,
        )
    )

    date_creation: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    date_modification: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
