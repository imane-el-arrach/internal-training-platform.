import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class RoleUtilisateur(str, Enum):
    administrateur = "administrateur"
    collaborateur = "collaborateur"


class Utilisateur(SQLModel, table=True):
    __tablename__ = "utilisateurs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    nom: str = Field(max_length=100, nullable=False)
    prenom: str = Field(max_length=100, nullable=False)
    email: str = Field(max_length=255, unique=True, nullable=False, index=True)

    
    mot_de_passe_hash: str = Field(max_length=255, nullable=False)

    role: RoleUtilisateur = Field(
        sa_column=Column(
            SAEnum(RoleUtilisateur, name="role_utilisateur"),
            nullable=False,
            server_default=RoleUtilisateur.collaborateur.value,
        )
    )

    poste: str | None = Field(default=None, max_length=150)
    departement_id: uuid.UUID | None = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("departements.id", ondelete="SET NULL"),
            nullable=True,
        )
    )

    actif: bool = Field(default=True, nullable=False)
    date_creation: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    
    date_derniere_connexion: datetime | None = None
    date_modification: datetime | None = None