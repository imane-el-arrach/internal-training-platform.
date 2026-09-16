import re

_SEPARATEUR_PHRASE = re.compile(r"(?<=[.!?])\s+")


def _decouper_en_phrases(texte: str) -> list[str]:
    phrases = _SEPARATEUR_PHRASE.split(texte.strip())
    return [p.strip() for p in phrases if p.strip()]


def decouper_texte(
    texte: str,
    taille_max_caracteres: int = 800,
    chevauchement_phrases: int = 1,
) -> list[str]:
   
    phrases = _decouper_en_phrases(texte)
    if not phrases:
        return []

    fragments: list[str] = []
    fragment_courant: list[str] = []
    taille_courante = 0

    for phrase in phrases:
        taille_phrase = len(phrase) + 1  

        if taille_courante + taille_phrase > taille_max_caracteres and fragment_courant:
            fragments.append(" ".join(fragment_courant))
            # Chevauchement : on repart avec les dernières phrases du fragment précédent
            fragment_courant = fragment_courant[-chevauchement_phrases:] if chevauchement_phrases else []
            taille_courante = sum(len(p) + 1 for p in fragment_courant)

        fragment_courant.append(phrase)
        taille_courante += taille_phrase

    if fragment_courant:
        fragments.append(" ".join(fragment_courant))

    return fragments
