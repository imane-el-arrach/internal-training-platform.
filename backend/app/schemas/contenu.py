import uuid
from datetime import datetime

from sqlmodel import SQLModel

from app.models.contenu import TypeContenu
from app.models.contenu import StatutIngestion, TypeContenu

class ContenuRead(SQLModel):
    id: uuid.UUID
    formation_id: uuid.UUID
    type: TypeContenu
    titre: str
    chemin_fichier: str
    ordre: int
    duree_secondes: int | None
    statut_ingestion: StatutIngestion
    date_indexation: datetime | None
    erreur_ingestion: str | None
    date_creation: datetime