import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.db.session import get_session
from app.models.formation import Formation
from app.models.questionnaire import Questionnaire
from app.models.tentative import Tentative
from app.schemas.questionnaire import (
    QuestionnaireCreate,
    QuestionnaireRead,
    QuestionnaireUpdate,
)

router = APIRouter(prefix="/api/formations/{formation_id}/questionnaires", tags=["Questionnaires"])


def _get_formation_ou_404(formation_id: uuid.UUID, session: Session) -> Formation:
    formation = session.get(Formation, formation_id)
    if formation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")
    return formation


@router.post(
    "",
    response_model=QuestionnaireRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_administrateur)],
)
def creer_questionnaire(
    formation_id: uuid.UUID,
    donnees: QuestionnaireCreate,
    session: Session = Depends(get_session),
) -> Questionnaire:
    _get_formation_ou_404(formation_id, session)

    questionnaire = Questionnaire(
        formation_id=formation_id,
        titre=donnees.titre,
        score_minimum_reussite=donnees.score_minimum_reussite,
        nombre_tentatives_max=donnees.nombre_tentatives_max,
        temps_limite_secondes=donnees.temps_limite_secondes,
    )
    session.add(questionnaire)
    session.commit()
    session.refresh(questionnaire)
    return questionnaire


@router.get(
    "",
    response_model=list[QuestionnaireRead],
    dependencies=[Depends(get_utilisateur_courant)],
)
def lister_questionnaires(
    formation_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> list[Questionnaire]:
    _get_formation_ou_404(formation_id, session)
    return list(
        session.exec(
            select(Questionnaire).where(Questionnaire.formation_id == formation_id)
        ).all()
    )


@router.patch(
    "/{questionnaire_id}",
    response_model=QuestionnaireRead,
    dependencies=[Depends(exiger_administrateur)],
)
def modifier_questionnaire(
    formation_id: uuid.UUID,
    questionnaire_id: uuid.UUID,
    donnees: QuestionnaireUpdate,
    session: Session = Depends(get_session),
) -> Questionnaire:
    questionnaire = session.get(Questionnaire, questionnaire_id)
    if questionnaire is None or questionnaire.formation_id != formation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questionnaire introuvable")

    changements = donnees.model_dump(exclude_unset=True)
    for champ, valeur in changements.items():
        setattr(questionnaire, champ, valeur)

    session.add(questionnaire)
    session.commit()
    session.refresh(questionnaire)
    return questionnaire


@router.delete(
    "/{questionnaire_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_administrateur)],
)
def supprimer_questionnaire(
    formation_id: uuid.UUID,
    questionnaire_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> None:
    questionnaire = session.get(Questionnaire, questionnaire_id)
    if questionnaire is None or questionnaire.formation_id != formation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questionnaire introuvable")

    tentative_existante = session.exec(
        select(Tentative.id).where(Tentative.questionnaire_id == questionnaire_id)
    ).first()
    if tentative_existante is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Ce questionnaire ne peut plus être supprimé, car des "
                "tentatives de collaborateurs sont déjà enregistrées."
            ),
        )

    session.delete(questionnaire)
    session.commit()
