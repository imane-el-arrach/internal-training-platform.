import json
import re

from pydantic import ValidationError

from app.schemas.question import QuestionCreate

_BLOC_CODE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def extraire_quiz_json(texte_llm: str) -> list[QuestionCreate] | None:
    """Accepte l'ancien JSON et le format Q: / * / - utilisé par l'import.

    Le texte est plus robuste que le JSON pour une réponse de LLM : des
    guillemets dans une réponse ne risquent plus de rendre le quiz invalide.
    """
    texte_nettoye = _BLOC_CODE.sub("", texte_llm).strip()

    try:
        donnees = json.loads(texte_nettoye)
    except json.JSONDecodeError:
        return _extraire_quiz_texte(texte_nettoye)

    if not isinstance(donnees, list):
        return _extraire_quiz_texte(texte_nettoye)

    try:
        return [QuestionCreate(**item) for item in donnees]
    except (ValidationError, TypeError):
        return _extraire_quiz_texte(texte_nettoye)


def _extraire_quiz_texte(texte: str) -> list[QuestionCreate] | None:
    questions: list[QuestionCreate] = []

    for bloc in re.split(r"\n\s*\n", texte):
        lignes = [ligne.strip() for ligne in bloc.splitlines() if ligne.strip()]
        if not lignes:
            continue

        ligne_question = next(
            (ligne for ligne in lignes if re.match(r"^(Q|Question)\s*[:?]", ligne, re.IGNORECASE)),
            None,
        )
        if ligne_question is None:
            return None

        enonce = re.sub(r"^(Q|Question)\s*[:?]\s*", "", ligne_question, flags=re.IGNORECASE).strip()
        lignes_reponses = [ligne for ligne in lignes if ligne != ligne_question]
        if not enonce or len(lignes_reponses) < 2:
            return None

        reponses = []
        for ligne in lignes_reponses:
            correspondance = re.match(r"^([*-])\s*(.+)$", ligne)
            if correspondance is None:
                return None
            reponses.append(
                {
                    "texte": correspondance.group(2).strip(),
                    "est_correcte": correspondance.group(1) == "*",
                }
            )

        if sum(reponse["est_correcte"] for reponse in reponses) != 1:
            return None

        try:
            questions.append(QuestionCreate(enonce=enonce, reponses=reponses))
        except ValidationError:
            return None

    return questions or None
