import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import CheckConstraint, Column, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class TypeContenu(str, Enum):
    video = "video"
    pdf = "pdf"
    presentation = "presentation"
    lien = "lien"
    document = "document"

class StatutIngestion(str, Enum):
    en_attente = "en_attente"
    en_cours = "en_cours"
    terminee = "terminee"
    echec = "echec"
    non_indexable = "non_indexable"

class Contenu(SQLModel, table=True):
    __tablename__ = "contenus"
    __table_args__ = (
        UniqueConstraint("formation_id", "ordre", name="uq_contenu_ordre"),
        CheckConstraint(
            "duree_secondes IS NULL OR duree_secondes >= 0", name="chk_duree_contenu"
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    formation_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("formations.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    type: TypeContenu = Field(
        sa_column=Column(SAEnum(TypeContenu, name="type_contenu"), nullable=False)
    )
    titre: str = Field(max_length=255, nullable=False)
    chemin_fichier: str = Field(max_length=500, nullable=False)
    ordre: int = Field(default=1, nullable=False)
    duree_secondes: int | None = None
    statut_ingestion: StatutIngestion = Field(
        sa_column=Column(
            SAEnum(StatutIngestion, name="statut_ingestion"),
            nullable=False,
            server_default=StatutIngestion.en_attente.value,
        )
    )
    date_indexation: datetime | None = None
    erreur_ingestion: str | None = Field(default=None, max_length=1000)
    date_creation: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
