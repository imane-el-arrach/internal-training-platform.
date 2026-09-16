import uuid

from sqlmodel import Session, select

from app.models.contenu import Contenu
from app.models.contenu_chunk import ContenuChunk
from app.services.embeddings import generer_embedding


def rechercher_chunks_formation(
    session: Session,
    formation_id: uuid.UUID,
    question: str,
    top_k: int = 5,
) -> list[tuple[ContenuChunk, float]]:
    """
    Utilisé pour le mode QUESTION : recherche par similarité, on ne veut que
    les fragments pertinents à *cette* question précise, pas tout le contenu.
    """
    vecteur_question = generer_embedding(question)
    distance = ContenuChunk.embedding.cosine_distance(vecteur_question)

    resultats = session.exec(
        select(ContenuChunk, distance.label("distance"))
        .join(Contenu, Contenu.id == ContenuChunk.contenu_id)
        .where(Contenu.formation_id == formation_id)
        .order_by(distance)
        .limit(top_k)
    ).all()

    return [(chunk, 1 - dist) for chunk, dist in resultats]


def recuperer_tous_chunks_contenu(
    session: Session,
    contenu_id: uuid.UUID,
) -> list[ContenuChunk]:
    """
    Utilisé pour les modes RESUME, POINTS_CLES, EXPLICATION_SIMPLE, QUIZ,
    QUESTIONS_REVISION : pas de recherche par similarité ici — il n'y a pas
    de "question" à comparer, on veut couvrir tout le contenu, donc on
    récupère tous ses fragments, dans leur ordre d'origine.
    """
    return list(
        session.exec(
            select(ContenuChunk)
            .where(ContenuChunk.contenu_id == contenu_id)
            .order_by(ContenuChunk.ordre)
        ).all()
    )

