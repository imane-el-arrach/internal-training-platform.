from functools import lru_cache


class ModeleEmbeddingsIndisponible(RuntimeError):
    """Le modèle local n'est pas disponible et ne peut pas être récupéré."""

NOM_MODELE_EMBEDDINGS = "paraphrase-multilingual-MiniLM-L12-v2"


@lru_cache(maxsize=1)
def _get_modele():
    from sentence_transformers import SentenceTransformer

    try:
        return SentenceTransformer(NOM_MODELE_EMBEDDINGS)
    except OSError as erreur:
        # Au premier lancement, SentenceTransformer télécharge le modèle depuis
        # Hugging Face. Sur certains postes d'entreprise, le pare-feu ou le proxy
        # bloque cette connexion : ne pas exposer la trace réseau à l'utilisateur.
        raise ModeleEmbeddingsIndisponible(
            "Le modèle IA d’indexation n’est pas disponible sur le serveur. "
            "Autorisez l’accès HTTPS à huggingface.co, puis relancez l’indexation."
        ) from erreur


def generer_embedding(texte: str) -> list[float]:
    modele = _get_modele()
    vecteur = modele.encode(texte, normalize_embeddings=True)
    return vecteur.tolist()


def generer_embeddings_batch(textes: list[str]) -> list[list[float]]:
    if not textes:
        return []
    modele = _get_modele()
    vecteurs = modele.encode(textes, normalize_embeddings=True, batch_size=32)
    return [v.tolist() for v in vecteurs]
