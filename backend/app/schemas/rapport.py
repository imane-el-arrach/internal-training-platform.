import uuid
from datetime import date, datetime

from sqlmodel import SQLModel


class ResultatIndividuelRead(SQLModel):
    utilisateur_id: uuid.UUID
    utilisateur_nom: str
    utilisateur_prenom: str
    departement_nom: str | None
    formation_id: uuid.UUID
    formation_titre: str
    formation_obligatoire: bool
    statut: str
    pourcentage: int
    date_limite: date | None
    derniere_activite: datetime | None


class RapportSuiviRead(SQLModel):
    collaborateurs_concernes: int
    progressions_total: int
    progressions_terminees: int
    formations_en_attente: int
    progressions_en_cours: int
    taux_completion: int
    taux_reussite: int | None
    taux_conformite: int | None
    resultats: list[ResultatIndividuelRead]
