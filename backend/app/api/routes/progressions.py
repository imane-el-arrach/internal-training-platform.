import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from datetime import datetime, timezone
from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.db.session import get_session
from app.models.utilisateur import Utilisateur
from app.schemas.progression import ProgressionRead
from app.models.contenu import Contenu, TypeContenu
from app.models.progression import Progression, StatutProgression
from app.models.progression_contenu import ProgressionContenu
from app.schemas.progression_contenu import (
    EtatProgressionContenusRead,
    CompletionContenuRequest,
    ProgressionContenuRead,
)
router = APIRouter(prefix="/api/progressions", tags=["Progressions"])


@router.get("/mes-formations", response_model=list[ProgressionRead])
def lister_mes_progressions(
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> list[Progression]:
    return list(
        session.exec(
            select(Progression).where(Progression.utilisateur_id == utilisateur.id)
        ).all()
    )


@router.get("", response_model=list[ProgressionRead])
def lister_progressions(
    formation_id: uuid.UUID | None = Query(default=None),
    utilisateur_id: uuid.UUID | None = Query(default=None),
    admin: Utilisateur = Depends(exiger_administrateur),
    session: Session = Depends(get_session),
) -> list[Progression]:
    requete = select(Progression)
    if formation_id is not None:
        requete = requete.where(Progression.formation_id == formation_id)
    if utilisateur_id is not None:
        requete = requete.where(Progression.utilisateur_id == utilisateur_id)
    return list(session.exec(requete).all())

@router.post(
    "/contenus/{contenu_id}/terminer",
    response_model=ProgressionContenuRead,
    status_code=status.HTTP_201_CREATED,
)
def terminer_contenu(
    contenu_id: uuid.UUID,
    donnees: CompletionContenuRequest,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> ProgressionContenu:
    contenu = session.get(Contenu, contenu_id)
    if contenu is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contenu introuvable",
        )

    if contenu.type not in {TypeContenu.video, TypeContenu.pdf, TypeContenu.presentation}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ce type de contenu ne peut pas être validé automatiquement.",
        )

    if not contenu.duree_secondes or contenu.duree_secondes <= 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une durée estimée est requise avant de pouvoir valider ce contenu.",
        )

    seuil_validation = int(contenu.duree_secondes * 0.9)
    if donnees.duree_consultee_secondes < seuil_validation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Poursuivez la consultation jusqu’à {seuil_validation} secondes pour valider ce contenu.",
        )

    progression = session.exec(
        select(Progression).where(
            Progression.utilisateur_id == utilisateur.id,
            Progression.formation_id == contenu.formation_id,
        )
    ).first()

    if progression is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n’êtes pas affecté à cette formation.",
        )

    progression_contenu = session.exec(
        select(ProgressionContenu).where(
            ProgressionContenu.utilisateur_id == utilisateur.id,
            ProgressionContenu.contenu_id == contenu.id,
        )
    ).first()

    if progression_contenu is None:
        progression_contenu = ProgressionContenu(
            utilisateur_id=utilisateur.id,
            contenu_id=contenu.id,
        )
        session.add(progression_contenu)
        session.flush()
    # Un quiz déjà réussi garde la formation à 100 %.
    if progression.statut != StatutProgression.termine:
        contenus = list(
            session.exec(
                select(Contenu).where(
                    Contenu.formation_id == contenu.formation_id,
                    Contenu.type.in_([TypeContenu.video, TypeContenu.pdf, TypeContenu.presentation]),
                )
            ).all()
        )

        if not contenus:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La formation ne contient aucun contenu suivi automatiquement.",
            )

        contenus_termines = list(
            session.exec(
                select(ProgressionContenu).where(
                    ProgressionContenu.utilisateur_id == utilisateur.id,
                    ProgressionContenu.contenu_id.in_([element.id for element in contenus]),
                )
            ).all()
        )

        pourcentage = round((len(contenus_termines) * 100) / len(contenus))

        progression.pourcentage = pourcentage
        progression.statut = (
            StatutProgression.termine
            if pourcentage == 100
            else StatutProgression.en_cours
        )
        progression.date_debut = progression.date_debut or datetime.now(timezone.utc)
        progression.derniere_activite = datetime.now(timezone.utc)

        if pourcentage == 100:
            progression.date_fin = datetime.now(timezone.utc)

        session.add(progression)

    session.commit()
    session.refresh(progression_contenu)

    return progression_contenu


@router.get(
    "/formations/{formation_id}/contenus",
    response_model=EtatProgressionContenusRead,
)
def lire_progression_contenus(
    formation_id: uuid.UUID,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> EtatProgressionContenusRead:
    progression = session.exec(
        select(Progression).where(
            Progression.utilisateur_id == utilisateur.id,
            Progression.formation_id == formation_id,
        )
    ).first()

    if progression is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n’êtes pas affecté à cette formation.",
        )

    contenus = list(
        session.exec(
            select(Contenu).where(Contenu.formation_id == formation_id)
        ).all()
    )

    contenus_termines = list(
        session.exec(
            select(ProgressionContenu.contenu_id).where(
                ProgressionContenu.utilisateur_id == utilisateur.id,
                ProgressionContenu.contenu_id.in_([contenu.id for contenu in contenus]),
            )
        ).all()
    )

    return EtatProgressionContenusRead(
        formation_id=formation_id,
        contenu_ids_termines=contenus_termines,
    )
