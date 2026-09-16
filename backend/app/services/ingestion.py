from pathlib import Path
import uuid

from sqlmodel import Session, delete

from app.core.config import settings
from app.db.session import engine
from app.models.contenu import Contenu, StatutIngestion
from app.models.contenu_chunk import ContenuChunk
from app.services.chunking import decouper_texte
from app.services.embeddings import ModeleEmbeddingsIndisponible, generer_embeddings_batch
from app.services.extraction import extraire_texte, nettoyer_texte_indexable


EXTENSIONS_INDEXABLES = {".pdf", ".pptx", ".mp4", ".webm", ".mov"}


def contenu_est_indexable(contenu: Contenu) -> bool:
    return Path(contenu.chemin_fichier).suffix.lower() in EXTENSIONS_INDEXABLES


def ingerer_contenu(session: Session, contenu: Contenu) -> int:
    chemin_fichier = Path(settings.UPLOAD_DIR) / contenu.chemin_fichier

    texte = extraire_texte(str(chemin_fichier))
    if not texte.strip():
        raise ValueError("Aucun texte exploitable n'a été trouvé dans ce contenu.")

    # Double protection : le texte est nettoyé à l'extraction et chaque
    # fragment est normalisé avant l'insertion dans PostgreSQL.
    fragments = [
        nettoyer_texte_indexable(fragment)
        for fragment in decouper_texte(texte)
    ]
    fragments = [fragment for fragment in fragments if fragment]
    if not fragments:
        raise ValueError("Le contenu ne produit aucun fragment indexable.")

    embeddings = generer_embeddings_batch(fragments)

    session.exec(
        delete(ContenuChunk).where(ContenuChunk.contenu_id == contenu.id)
    )

    for i, (fragment, vecteur) in enumerate(zip(fragments, embeddings)):
        session.add(
            ContenuChunk(
                contenu_id=contenu.id,
                texte=fragment,
                ordre=i,
                embedding=vecteur,
            )
        )

    session.commit()
    return len(fragments)


def lancer_ingestion_en_arriere_plan(contenu_id: uuid.UUID) -> None:
    with Session(engine) as session:
        contenu = session.get(Contenu, contenu_id)
        if contenu is None:
            return

        if not contenu_est_indexable(contenu):
            contenu.statut_ingestion = StatutIngestion.non_indexable
            contenu.erreur_ingestion = (
                "Ce type de contenu ne peut pas encore être indexé par l’assistant IA."
            )
            session.add(contenu)
            session.commit()
            return

        contenu.statut_ingestion = StatutIngestion.en_cours
        contenu.erreur_ingestion = None
        session.add(contenu)
        session.commit()

        try:
            ingerer_contenu(session, contenu)

            contenu.statut_ingestion = StatutIngestion.terminee
            contenu.date_indexation = __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            )
            contenu.erreur_ingestion = None
            session.add(contenu)
            session.commit()

        except ModeleEmbeddingsIndisponible as erreur:
            session.rollback()
            contenu = session.get(Contenu, contenu_id)
            if contenu is not None:
                contenu.statut_ingestion = StatutIngestion.echec
                contenu.erreur_ingestion = str(erreur)
                session.add(contenu)
                session.commit()
            print(f"[ingestion] Modèle d'embeddings indisponible pour {contenu_id} : {erreur}")

        except Exception as erreur:
            session.rollback()
            contenu = session.get(Contenu, contenu_id)
            if contenu is not None:
                contenu.statut_ingestion = StatutIngestion.echec
                contenu.erreur_ingestion = str(erreur)[:1000]
                session.add(contenu)
                session.commit()
            print(f"[ingestion] Échec pour le contenu {contenu_id} : {erreur}")
