import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint, Column, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel

class StatutProgression(str, Enum):
    non_commence = "non_commence"
    en_cours = "en_cours"
    termine = "termine"


class Progression(SQLModel, table=True):
    __tablename__ = "progressions"
    __table_args__ = (
        UniqueConstraint(
            "utilisateur_id", "formation_id", name="uq_progression_utilisateur_formation"
        ),
        CheckConstraint("pourcentage BETWEEN 0 AND 100", name="chk_progression"),
        CheckConstraint(
            "date_fin IS NULL OR date_debut IS NULL OR date_fin >= date_debut",
            name="chk_dates_progression",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    utilisateur_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    formation_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("formations.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    # Trace l'origine : affectation individuelle ou héritée d'un département
    # (fan-out). CASCADE : supprimer l'affectation supprime les progressions
    # qui en découlent — cohérent, une progression n'existe que parce que
    # l'affectation qui l'a générée existe.
    affectation_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("affectations.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    statut: StatutProgression = Field(
        sa_column=Column(
            SAEnum(StatutProgression, name="statut_progression"),
            nullable=False,
            server_default=StatutProgression.non_commence.value,
        )
    )
    pourcentage: int = Field(default=0, nullable=False)
    date_debut: datetime | None = None
    date_fin: datetime | None = None
    derniere_activite: datetime | None = None
