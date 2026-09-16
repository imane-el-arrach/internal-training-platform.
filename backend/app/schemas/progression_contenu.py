import uuid
from datetime import datetime

from sqlmodel import SQLModel


class ProgressionContenuRead(SQLModel):
    id: uuid.UUID
    utilisateur_id: uuid.UUID
    contenu_id: uuid.UUID
    date_completion: datetime


class CompletionContenuRequest(SQLModel):
    """Durée réellement consultée, envoyée uniquement par le lecteur intégré."""

    duree_consultee_secondes: int


class EtatProgressionContenusRead(SQLModel):
    formation_id: uuid.UUID
    contenu_ids_termines: list[uuid.UUID]
