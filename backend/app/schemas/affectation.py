import uuid
from datetime import date, datetime

from pydantic import model_validator
from sqlmodel import SQLModel


class AffectationCreate(SQLModel):
    formation_id: uuid.UUID
    utilisateur_id: uuid.UUID | None = None
    departement_id: uuid.UUID | None = None
    date_limite: date | None = None

    @model_validator(mode="after")
    def verifier_cible_exclusive(self) -> "AffectationCreate":
        rempli = [self.utilisateur_id is not None, self.departement_id is not None]
        if sum(rempli) != 1:
            raise ValueError(
                "Renseigner exactement l'un des deux champs : "
                "utilisateur_id OU departement_id, jamais les deux, jamais aucun"
            )
        return self


class AffectationRead(SQLModel):
    id: uuid.UUID
    formation_id: uuid.UUID
    utilisateur_id: uuid.UUID | None
    departement_id: uuid.UUID | None
    affecte_par: uuid.UUID
    date_affectation: datetime
    date_limite: date | None
    nombre_progressions_generees: int
