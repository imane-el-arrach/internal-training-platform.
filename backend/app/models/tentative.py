import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint, Column, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class StatutTentative(str, Enum):
    EN_COURS = "en_cours"
    TERMINEE = "terminee"


class Tentative(SQLModel, table=True):
    __tablename__ = "tentatives"
    __table_args__ = (
        UniqueConstraint(
            "utilisateur_id",
            "questionnaire_id",
            "numero_tentative",
            name="uq_numero_tentative",
        ),
        CheckConstraint(
            "score IS NULL OR score BETWEEN 0 AND 100",
            name="chk_score",
        ),
        CheckConstraint(
            "numero_tentative > 0",
            name="chk_numero_tentative",
        ),
        CheckConstraint(
            "date_passage IS NULL OR date_passage >= date_debut",
            name="chk_dates_tentative",
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
    )

    utilisateur_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("utilisateurs.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    questionnaire_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("questionnaires.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    numero_tentative: int = Field(
        default=1,
        nullable=False,
    )

    statut: StatutTentative = Field(
        sa_column=Column(
            SAEnum(
                StatutTentative,
                name="statut_tentative",
                values_callable=lambda enum_class: [
                    e.value for e in enum_class
                ],
            ),
            nullable=False,
            server_default=StatutTentative.EN_COURS.value,
        )
    )

    
    score: int | None = None
    reussi: bool | None = None

    hors_delai: bool = Field(
        default=False,
        nullable=False,
    )

    date_debut: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
    )

    date_passage: datetime | None = None