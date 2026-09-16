import uuid
from datetime import datetime

from sqlmodel import SQLModel

from app.models.progression import StatutProgression


class ProgressionRead(SQLModel):
    id: uuid.UUID
    utilisateur_id: uuid.UUID
    formation_id: uuid.UUID
    affectation_id: uuid.UUID
    statut: StatutProgression
    pourcentage: int
    date_debut: datetime | None
    date_fin: datetime | None
    derniere_activite: datetime | None
