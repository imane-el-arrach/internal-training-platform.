import uuid
from datetime import datetime

from app.models.tentative import StatutTentative
from sqlmodel import SQLModel


class ReponseSoumise(SQLModel):
    question_id: uuid.UUID
    reponse_possible_id: uuid.UUID


class TentativeSoumission(SQLModel):
    reponses: list[ReponseSoumise]
    # Renseigné uniquement lorsque le compteur côté interface arrive à zéro.
    # Il permet de clôturer proprement une tentative partielle même si le
    # navigateur et le serveur atteignent la limite à quelques millisecondes
    # d'écart.
    expiration_automatique: bool = False


class TentativeDemarreeRead(SQLModel):
    tentative_id: uuid.UUID
    date_debut: datetime
    temps_limite_secondes: int | None


class TentativeRead(SQLModel):
    id: uuid.UUID
    utilisateur_id: uuid.UUID
    utilisateur_nom: str
    utilisateur_prenom: str
    questionnaire_id: uuid.UUID
    numero_tentative: int
    statut: StatutTentative
    score: int | None
    reussi: bool | None
    hors_delai: bool
    date_debut: datetime
    date_passage: datetime | None
    certificat_id: uuid.UUID | None


class ResultatPersonnelRead(TentativeRead):
    """Tentative enrichie pour l'historique personnel du collaborateur."""

    formation_id: uuid.UUID
    formation_titre: str
    questionnaire_titre: str
    score_minimum_reussite: int
