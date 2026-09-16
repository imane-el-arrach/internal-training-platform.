import uuid
from datetime import date, datetime, timezone

from sqlalchemy import CheckConstraint, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class Affectation(SQLModel, table=True):
    __tablename__ = "affectations"
    __table_args__ = (
        CheckConstraint(
            "(utilisateur_id IS NOT NULL AND departement_id IS NULL) OR "
            "(utilisateur_id IS NULL AND departement_id IS NOT NULL)",
            name="chk_affectation_cible",
        ),
        CheckConstraint(
            "date_limite IS NULL OR date_limite >= date_affectation::DATE",
            name="chk_date_limite",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    formation_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("formations.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    # XOR : l'un des deux est rempli, jamais les deux, jamais aucun (cf. CHECK ci-dessus)
    utilisateur_id: uuid.UUID | None = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"),
            nullable=True,
        )
    )
    departement_id: uuid.UUID | None = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("departements.id", ondelete="CASCADE"),
            nullable=True,
        )
    )

    # RESTRICT : on garde toujours une trace de qui a fait l'affectation ;
    # un admin ne peut pas être supprimé physiquement tant qu'il en existe une
    # (cohérent avec la désactivation logique des utilisateurs, jamais de
    # suppression physique en pratique).
    affecte_par: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="RESTRICT"),
            nullable=False,
        )
    )

    date_affectation: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    date_limite: date | None = None

