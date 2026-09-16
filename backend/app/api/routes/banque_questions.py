import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import exiger_administrateur
from app.db.session import get_session
from app.models.question import Question
from app.models.question_banque import QuestionBanque, ReponseBanque
from app.models.questionnaire import Questionnaire
from app.models.reponse_possible import ReponsePossible
from app.models.utilisateur import Utilisateur
from app.schemas.question_banque import QuestionBanqueCreate, QuestionBanqueRead

router = APIRouter(prefix="/api/banque-questions", tags=["Banque de questions"])


def _lire(question: QuestionBanque, session: Session) -> QuestionBanqueRead:
    reponses = session.exec(select(ReponseBanque).where(ReponseBanque.question_banque_id == question.id).order_by(ReponseBanque.ordre)).all()
    return QuestionBanqueRead(**question.model_dump(), reponses=reponses)


@router.get("", response_model=list[QuestionBanqueRead])
def lister_banque(_: Utilisateur = Depends(exiger_administrateur), session: Session = Depends(get_session)) -> list[QuestionBanqueRead]:
    questions = session.exec(select(QuestionBanque).order_by(QuestionBanque.date_creation.desc())).all()
    return [_lire(question, session) for question in questions]


@router.post("", response_model=QuestionBanqueRead, status_code=status.HTTP_201_CREATED)
def creer_question_banque(donnees: QuestionBanqueCreate, admin: Utilisateur = Depends(exiger_administrateur), session: Session = Depends(get_session)) -> QuestionBanqueRead:
    question = QuestionBanque(enonce=donnees.enonce, points=donnees.points, cree_par=admin.id)
    session.add(question)
    session.flush()
    for ordre, reponse in enumerate(donnees.reponses, start=1):
        session.add(ReponseBanque(question_banque_id=question.id, texte=reponse.texte, est_correcte=reponse.est_correcte, ordre=ordre))
    session.commit()
    session.refresh(question)
    return _lire(question, session)


@router.post("/depuis-question/{question_id}", response_model=QuestionBanqueRead, status_code=status.HTTP_201_CREATED)
def ajouter_depuis_question(question_id: uuid.UUID, admin: Utilisateur = Depends(exiger_administrateur), session: Session = Depends(get_session)) -> QuestionBanqueRead:
    question = session.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Question introuvable")
    reponses = session.exec(select(ReponsePossible).where(ReponsePossible.question_id == question.id).order_by(ReponsePossible.ordre)).all()
    modele = QuestionBanque(enonce=question.enonce, points=question.points, cree_par=admin.id)
    session.add(modele)
    session.flush()
    for reponse in reponses:
        session.add(ReponseBanque(question_banque_id=modele.id, texte=reponse.texte, est_correcte=reponse.est_correcte, ordre=reponse.ordre))
    session.commit()
    session.refresh(modele)
    return _lire(modele, session)


@router.post("/{question_banque_id}/ajouter-au-questionnaire/{questionnaire_id}")
def ajouter_au_questionnaire(question_banque_id: uuid.UUID, questionnaire_id: uuid.UUID, _: Utilisateur = Depends(exiger_administrateur), session: Session = Depends(get_session)) -> dict[str, str]:
    modele = session.get(QuestionBanque, question_banque_id)
    questionnaire = session.get(Questionnaire, questionnaire_id)
    if modele is None or questionnaire is None:
        raise HTTPException(status_code=404, detail="Question ou questionnaire introuvable")
    ordre = max((q.ordre for q in session.exec(select(Question).where(Question.questionnaire_id == questionnaire_id)).all()), default=0) + 1
    question = Question(questionnaire_id=questionnaire_id, enonce=modele.enonce, points=modele.points, ordre=ordre)
    session.add(question)
    session.flush()
    for reponse in session.exec(select(ReponseBanque).where(ReponseBanque.question_banque_id == modele.id).order_by(ReponseBanque.ordre)).all():
        session.add(ReponsePossible(question_id=question.id, texte=reponse.texte, est_correcte=reponse.est_correcte, ordre=reponse.ordre))
    session.commit()
    return {"message": "Question ajoutée au questionnaire"}


@router.delete("/{question_banque_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_question_banque(question_banque_id: uuid.UUID, _: Utilisateur = Depends(exiger_administrateur), session: Session = Depends(get_session)) -> None:
    question = session.get(QuestionBanque, question_banque_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Question introuvable")
    session.delete(question)
    session.commit()
