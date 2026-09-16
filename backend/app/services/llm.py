from app.core.config import settings


def generer_reponse_llm(prompt_systeme: str, prompt_utilisateur: str) -> str:
    """
    Appelle Gemini avec le prompt système (règles générales, garde-fous)
    et le prompt utilisateur (contexte + consigne selon le mode).

    """
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError(
            "GOOGLE_API_KEY n'est pas configurée — ajoute-la dans le fichier .env"
        )

    import google.generativeai as genai

    genai.configure(api_key=settings.GOOGLE_API_KEY)

    modele = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=prompt_systeme,
    )

    reponse = modele.generate_content(prompt_utilisateur)
    return reponse.text.strip()
