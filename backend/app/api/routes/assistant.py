import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import get_utilisateur_courant
from app.db.session import get_session
from app.models.contenu import Contenu
from app.models.formation import Formation
from app.schemas.assistant import (
    AssistantGenerationRequest,
    AssistantQuestionRequest,
    AssistantReponse,
    FragmentUtilise,
)
from app.services.llm import generer_reponse_llm
from app.services.prompts import (
    PROMPT_SYSTEME,
    ModeAssistant,
    ModeGeneration,
    construire_prompt_utilisateur,
)
from app.services.quiz_parser import extraire_quiz_json
from app.services.recherche import recuperer_tous_chunks_contenu, rechercher_chunks_formation

router = APIRouter(tags=["Assistant IA"])


@router.post(
    "/api/formations/{formation_id}/assistant/question",
    response_model=AssistantReponse,
)
def poser_question(
    formation_id: uuid.UUID,
    donnees: AssistantQuestionRequest,
    utilisateur=Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> AssistantReponse:
    formation = session.get(Formation, formation_id)
    if formation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")

    resultats = rechercher_chunks_formation(session, formation_id, donnees.question, top_k=5)
    if not resultats:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Aucun contenu indexé pour cette formation — l'ingestion a-t-elle été lancée ?",
        )

    fragments_texte = [chunk.texte for chunk, _ in resultats]
    prompt_utilisateur = construire_prompt_utilisateur(
        ModeAssistant.QUESTION, fragments_texte, question=donnees.question
    )

    texte_reponse = generer_reponse_llm(PROMPT_SYSTEME, prompt_utilisateur)

    return AssistantReponse(
        mode=ModeAssistant.QUESTION,
        reponse=texte_reponse,
        fragments_utilises=[
            FragmentUtilise(
                fragment_id=chunk.id,
                contenu_id=chunk.contenu_id,
                texte=chunk.texte,
                score_similarite=round(score, 4),
            )
            for chunk, score in resultats
        ],
    )


@router.post(
    "/api/contenus/{contenu_id}/assistant/generer",
    response_model=AssistantReponse,
)
def generer(
    contenu_id: uuid.UUID,
    mode: ModeGeneration = Query(..., description="resume | explication_simple | points_cles | quiz | questions_revision"),
    donnees: AssistantGenerationRequest = AssistantGenerationRequest(),
    utilisateur=Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> AssistantReponse:

    contenu = session.get(Contenu, contenu_id)
    if contenu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contenu introuvable")

    chunks = recuperer_tous_chunks_contenu(session, contenu_id)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ce contenu n'a pas encore été indexé — lance /api/contenus/{id}/ingerer d'abord",
        )

    fragments_texte = [c.texte for c in chunks]
    prompt_utilisateur = construire_prompt_utilisateur(
        mode,
        fragments_texte,
        nombre_points=donnees.nombre_points,
        nombre_questions=donnees.nombre_questions,
    )

    texte_reponse = generer_reponse_llm(PROMPT_SYSTEME, prompt_utilisateur)

    quiz_propose = None
    if mode == ModeGeneration.QUIZ:
        quiz_propose = extraire_quiz_json(texte_reponse)
        if quiz_propose is not None:
            texte_reponse = f"{len(quiz_propose)} question(s) générée(s), voir quiz_propose."
        

    return AssistantReponse(
        mode=ModeAssistant(mode.value),
        reponse=texte_reponse,
        fragments_utilises=[
            FragmentUtilise(fragment_id=c.id, contenu_id=c.contenu_id, texte=c.texte)
            for c in chunks
        ],
        quiz_propose=quiz_propose,
    )
