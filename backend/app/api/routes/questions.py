import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlmodel import delete

from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.db.session import get_session
from app.models.question import Question
from app.models.questionnaire import Questionnaire
from app.models.reponse_possible import ReponsePossible
from app.schemas.question import QuestionCreate, QuestionPublic, QuestionRead, QuestionUpdate
from app.schemas.question_lot import QuestionsLotCreate
from app.models.utilisateur import Utilisateur
from app.models.reponse_utilisateur import ReponseUtilisateur
from app.schemas.reponses import ReponsesQuestionUpdate

router = APIRouter(prefix="/api/questionnaires/{questionnaire_id}/questions", tags=["Questions"])


def _get_questionnaire_ou_404(questionnaire_id: uuid.UUID, session: Session) -> Questionnaire:
    questionnaire = session.get(Questionnaire, questionnaire_id)
    if questionnaire is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questionnaire introuvable")
    return questionnaire


def _prochain_ordre(questionnaire_id: uuid.UUID, session: Session) -> int:
    questions = session.exec(
        select(Question).where(Question.questionnaire_id == questionnaire_id)
    ).all()
    return (max((q.ordre for q in questions), default=0)) + 1


@router.post(
    "",
    response_model=QuestionRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_administrateur)],
)
def creer_question(
    questionnaire_id: uuid.UUID,
    donnees: QuestionCreate,
    session: Session = Depends(get_session),
) -> Question:
   
    _get_questionnaire_ou_404(questionnaire_id, session)

    question = Question(
        questionnaire_id=questionnaire_id,
        enonce=donnees.enonce,
        points=donnees.points,
        ordre=_prochain_ordre(questionnaire_id, session),
    )
    session.add(question)
    session.flush()  

    for i, reponse in enumerate(donnees.reponses, start=1):
        session.add(
            ReponsePossible(
                question_id=question.id,
                texte=reponse.texte,
                est_correcte=reponse.est_correcte,
                ordre=i,
            )
        )

    session.commit()
    session.refresh(question)
    
    question.reponses = session.exec(
        select(ReponsePossible).where(ReponsePossible.question_id == question.id).order_by(ReponsePossible.ordre)
    ).all()
    return question


@router.get(
    "",
    response_model=list[QuestionRead],
    dependencies=[Depends(exiger_administrateur)],
)
def lister_questions_admin(
    questionnaire_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> list[Question]:
   
    _get_questionnaire_ou_404(questionnaire_id, session)
    questions = list(
        session.exec(
            select(Question)
            .where(Question.questionnaire_id == questionnaire_id)
            .order_by(Question.ordre)
        ).all()
    )
    for q in questions:
        q.reponses = session.exec(
            select(ReponsePossible).where(ReponsePossible.question_id == q.id).order_by(ReponsePossible.ordre)
        ).all()
    return questions


@router.get(
    "/quiz",
    response_model=list[QuestionPublic],
    dependencies=[Depends(get_utilisateur_courant)],
)
def lister_questions_pour_quiz(
    questionnaire_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> list[Question]:
    
    _get_questionnaire_ou_404(questionnaire_id, session)
    questions = list(
        session.exec(
            select(Question)
            .where(Question.questionnaire_id == questionnaire_id)
            .order_by(Question.ordre)
        ).all()
    )
    for q in questions:
        q.reponses = session.exec(
            select(ReponsePossible).where(ReponsePossible.question_id == q.id).order_by(ReponsePossible.ordre)
        ).all()
    return questions


@router.patch(
    "/{question_id}",
    response_model=QuestionRead,
    dependencies=[Depends(exiger_administrateur)],
)
def modifier_question(
    questionnaire_id: uuid.UUID,
    question_id: uuid.UUID,
    donnees: QuestionUpdate,
    session: Session = Depends(get_session),
) -> Question:
    question = session.get(Question, question_id)
    if question is None or question.questionnaire_id != questionnaire_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question introuvable")

    changements = donnees.model_dump(exclude_unset=True)
    for champ, valeur in changements.items():
        setattr(question, champ, valeur)

    session.add(question)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une question occupe déjà cette position dans le questionnaire",
        )
    session.refresh(question)
    question.reponses = session.exec(
        select(ReponsePossible).where(ReponsePossible.question_id == question.id).order_by(ReponsePossible.ordre)
    ).all()
    return question

@router.post(
    "/lot",
    response_model=list[QuestionRead],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_administrateur)],
)
def creer_questions_en_lot(
    questionnaire_id: uuid.UUID,
    donnees: QuestionsLotCreate,
    session: Session = Depends(get_session),
) -> list[Question]:
    """
    Sauvegarde un lot de questions en une seule transaction.
    Si une erreur survient, aucune question n'est enregistrée.
    """
    _get_questionnaire_ou_404(questionnaire_id, session)

    ordre_depart = _prochain_ordre(questionnaire_id, session)
    questions_creees: list[Question] = []

    try:
        for i, q in enumerate(donnees.questions):
            question = Question(
                questionnaire_id=questionnaire_id,
                enonce=q.enonce,
                points=q.points,
                ordre=ordre_depart + i,
            )
            session.add(question)
            session.flush()  # récupère question.id

            for j, r in enumerate(q.reponses, start=1):
                session.add(
                    ReponsePossible(
                        question_id=question.id,
                        texte=r.texte,
                        est_correcte=r.est_correcte,
                        ordre=j,
                    )
                )

            questions_creees.append(question)

        session.commit()

    except Exception:
        session.rollback()
        raise

    for q in questions_creees:
        session.refresh(q)
        q.reponses = session.exec(
            select(ReponsePossible)
            .where(ReponsePossible.question_id == q.id)
            .order_by(ReponsePossible.ordre)
        ).all()

    return questions_creees

@router.patch("/{question_id}/reponses")
def modifier_reponses_question(
    questionnaire_id: uuid.UUID,
    question_id: uuid.UUID,
    donnees: ReponsesQuestionUpdate,
    admin: Utilisateur = Depends(exiger_administrateur),
    session: Session = Depends(get_session),
) -> dict[str, str]:
    question = session.get(Question, question_id)

    if question is None or question.questionnaire_id != questionnaire_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question introuvable",
        )

    if len(donnees.reponses) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Une question doit contenir au moins deux réponses.",
        )

    if sum(reponse.est_correcte for reponse in donnees.reponses) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Une seule réponse doit être correcte.",
        )

    ordres = [reponse.ordre for reponse in donnees.reponses]
    if len(ordres) != len(set(ordres)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Chaque réponse doit avoir un ordre unique.",
        )

    tentative_existante = session.exec(
        select(ReponseUtilisateur.id).where(
            ReponseUtilisateur.question_id == question.id
        )
    ).first()

    if tentative_existante is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Les réponses ne peuvent plus être modifiées, car cette "
                "question possède déjà des réponses de collaborateurs."
            ),
        )

    session.exec(
        delete(ReponsePossible).where(
            ReponsePossible.question_id == question.id
        )
    )

    for reponse in donnees.reponses:
        session.add(
            ReponsePossible(
                question_id=question.id,
                texte=reponse.texte.strip(),
                est_correcte=reponse.est_correcte,
                ordre=reponse.ordre,
            )
        )

    session.commit()

    return {"message": "Réponses mises à jour avec succès."}

@router.delete(
    "/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_administrateur)],
)
def supprimer_question(
    questionnaire_id: uuid.UUID,
    question_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> None:
    question = session.get(Question, question_id)
    if question is None or question.questionnaire_id != questionnaire_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question introuvable")

    reponse_utilisateur_existante = session.exec(
        select(ReponseUtilisateur.id).where(
            ReponseUtilisateur.question_id == question_id
        )
    ).first()
    if reponse_utilisateur_existante is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cette question ne peut plus être supprimée, car des "
                "réponses de collaborateurs sont déjà enregistrées."
            ),
        )

    session.delete(question)
    session.commit()
