from datetime import date, datetime

from sqlmodel import SQLModel


class CertificatPublic(SQLModel):
    nom_complet: str
    formation_titre: str
    score: int | None
    date_obtention: datetime
    numero_certificat: str
    valide: bool
