import uuid
from datetime import datetime

from sqlmodel import SQLModel

from app.models.utilisateur import RoleUtilisateur


class UtilisateurCreate(SQLModel):
    nom: str
    prenom: str
    email: str
    mot_de_passe: str  # en clair ici uniquement, hashé avant stockage
    role: RoleUtilisateur = RoleUtilisateur.collaborateur
    poste: str | None = None
    departement_id: uuid.UUID | None = None


class UtilisateurUpdate(SQLModel):
    nom: str | None = None
    prenom: str | None = None
    email: str | None = None
    mot_de_passe: str | None = None
    role: RoleUtilisateur | None = None
    poste: str | None = None
    departement_id: uuid.UUID | None = None
    actif: bool | None = None


class UtilisateurRead(SQLModel):
    id: uuid.UUID
    nom: str
    prenom: str
    email: str
    role: RoleUtilisateur
    poste: str | None
    departement_id: uuid.UUID | None
    actif: bool
    date_creation: datetime
