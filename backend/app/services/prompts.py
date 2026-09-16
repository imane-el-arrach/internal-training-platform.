from enum import Enum


class ModeAssistant(str, Enum):
    QUESTION = "question"
    RESUME = "resume"
    EXPLICATION_SIMPLE = "explication_simple"
    POINTS_CLES = "points_cles"
    QUIZ = "quiz"
    QUESTIONS_REVISION = "questions_revision"


class ModeGeneration(str, Enum):
    """
    Sous-ensemble de ModeAssistant, utilisé uniquement par la route
    /assistant/generer. N'inclut PAS 'question' — ce mode a sa propre
    route dédiée (/formations/{id}/assistant/question) car il a besoin
    d'une question et d'une recherche par similarité, pas d'un contenu
    entier. L'exclure ici au niveau du type rend l'erreur impossible
    plutôt que de la détecter à l'exécution.
    """
    RESUME = "resume"
    EXPLICATION_SIMPLE = "explication_simple"
    POINTS_CLES = "points_cles"
    QUIZ = "quiz"
    QUESTIONS_REVISION = "questions_revision"


# Constant, quel que soit le mode : c'est ici que vivent les garde-fous
# anti-hallucination — critique vu que le contenu porte sur la sécurité et
# la conformité, une information inventée n'est pas acceptable.
PROMPT_SYSTEME = (
    "Tu es un assistant pédagogique intégré à la plateforme de formation "
    "d'EXIA Technologies. Tu aides des collaborateurs à mieux comprendre le "
    "contenu de leurs formations professionnelles (cybersécurité, sécurité "
    "incendie, RGPD, bonnes pratiques...).\n\n"
    "Règles strictes, à respecter sans exception :\n"
    "- Base-toi UNIQUEMENT sur le contexte fourni ci-dessous, extrait du "
    "contenu réel de la formation. N'utilise jamais tes connaissances "
    "générales pour compléter une information absente du contexte.\n"
    "- Si l'information demandée ne figure pas dans le contexte, dis-le "
    "clairement plutôt que d'improviser.\n"
    "- Reste factuel et professionnel, adapté à un contexte de "
    "sensibilisation en entreprise.\n"
    "- Réponds en français, sauf si le contexte fourni est dans une autre "
    "langue et qu'il est plus fidèle d'y répondre dans cette langue.\n\n"
    "Format de réponse, très important :\n"
    "- Ne commence JAMAIS par une phrase d'introduction du type \"Voici...\", "
    "\"Bien sûr, ...\", \"D'après le contexte...\". Réponds directement.\n"
    "- N'utilise AUCUNE syntaxe markdown (pas de **gras**, pas de #titres, "
    "pas de _italique_) : texte brut uniquement, avec des tirets simples "
    "'-' pour les listes si besoin.\n"
    "- Ne mentionne jamais les mots \"contexte\", \"extrait\" ou "
    "\"document fourni\" dans ta réponse — le collaborateur ne doit pas "
    "voir la mécanique interne, seulement une réponse naturelle."
)


def _formater_contexte(fragments: list[str]) -> str:
    return "\n\n".join(f"[Extrait {i + 1}]\n{f}" for i, f in enumerate(fragments))


def construire_prompt_utilisateur(
    mode: "ModeAssistant | ModeGeneration",
    fragments: list[str],
    question: str | None = None,
    nombre_points: int = 10,
    nombre_questions: int = 5,
) -> str:
    """
    Un seul point d'entrée pour construire le prompt utilisateur, quel que
    soit le mode choisi. Le contexte (fragments récupérés) est TOUJOURS
    injecté en premier, de la même façon — seule la consigne finale change.
    """
    contexte = _formater_contexte(fragments)

    if mode.value == "question":
        if not question:
            raise ValueError("Le mode QUESTION nécessite une question")
        consigne = f"Question du collaborateur : {question}\n\nRéponds à cette question en te basant strictement sur le contexte ci-dessus."

    elif mode.value == "resume":
        consigne = (
            f"Rédige un résumé structuré de ce contenu en {nombre_points} "
            "points clés, sous forme de liste numérotée. Chaque point doit "
            "être concis (une phrase)."
        )

    elif mode.value == "explication_simple":
        consigne = (
            "Explique ce contenu de manière simple et accessible, comme si "
            "tu t'adressais à quelqu'un qui découvre le sujet pour la "
            "première fois. Évite le jargon technique, ou explique-le si "
            "tu dois l'utiliser."
        )

    elif mode.value == "points_cles":
        consigne = (
            "Identifie et liste les points essentiels à retenir de ce "
            "contenu, sous forme de liste à puces. Va à l'essentiel, sans "
            "reformuler l'intégralité du texte."
        )

    elif mode.value == "quiz":
        consigne = (
            f"Génère {nombre_questions} questions à choix multiples pour "
            "évaluer la compréhension de ce contenu.\n"
            "Réponds UNIQUEMENT avec le format texte exact ci-dessous, sans "
            "phrase avant ou après. Ce format sera importé directement dans "
            "un questionnaire :\n"
            "Q: Énoncé de la question\n"
            "* Unique bonne réponse\n"
            "- Mauvaise réponse\n"
            "- Mauvaise réponse\n"
            "- Mauvaise réponse\n\n"
            "Sépare chaque question par une ligne vide. "
            "Chaque question doit avoir exactement 4 réponses possibles, "
            "une seule correcte. Base-toi strictement sur le contexte "
            "fourni, n'invente aucune information absente."
        )

    elif mode.value == "questions_revision":
        consigne = (
            f"Génère {nombre_questions} questions de révision ouvertes "
            "(sans choix de réponses) que le collaborateur peut utiliser "
            "pour vérifier par lui-même s'il a bien compris ce contenu. "
            "Formate en liste numérotée."
        )

    else:
        raise ValueError(f"Mode non géré : {mode}")

    return f"Contexte extrait de la formation :\n{contexte}\n\n{consigne}"


