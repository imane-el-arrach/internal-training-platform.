import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.db.session import get_session
from app.models.certificat import Certificat
from app.models.formation import Formation
from app.models.notification import TypeNotification
from app.models.progression import Progression, StatutProgression
from app.models.progression_contenu import ProgressionContenu
from app.models.contenu import Contenu, TypeContenu
from app.models.question import Question
from app.models.questionnaire import Questionnaire
from app.models.reponse_possible import ReponsePossible
from app.models.reponse_utilisateur import ReponseUtilisateur
from app.models.tentative import StatutTentative, Tentative
from app.models.utilisateur import Utilisateur
from app.schemas.tentative import (
    ResultatPersonnelRead,
    TentativeDemarreeRead,
    TentativeRead,
    TentativeSoumission,
)
from app.services.notifications import creer_notification

router = APIRouter(tags=["Tentatives"])


def _contenus_formation_termines(
    session: Session, utilisateur_id: uuid.UUID, formation_id: uuid.UUID
) -> bool:
    """Vérifie la totalité du parcours sans charger le contenu des fichiers."""
    contenu_ids = list(
        session.exec(
            select(Contenu.id).where(Contenu.formation_id == formation_id)
        ).all()
    )
    # Une formation sans ressource n'est jamais éligible au quiz : elle doit
    # d'abord être construite par l'administrateur.
    if not contenu_ids:
        return False

    contenus_suivis = list(
        session.exec(
            select(Contenu.id).where(
                Contenu.id.in_(contenu_ids),
                Contenu.type.in_([TypeContenu.video, TypeContenu.pdf, TypeContenu.presentation]),
            )
        ).all()
    )
    if not contenus_suivis:
        return False

    contenus_termines = set(
        session.exec(
            select(ProgressionContenu.contenu_id).where(
                ProgressionContenu.utilisateur_id == utilisateur_id,
                ProgressionContenu.contenu_id.in_(contenus_suivis),
            )
        ).all()
    )
    return len(contenus_termines) == len(contenus_suivis)


def _get_questionnaire_ou_404(questionnaire_id: uuid.UUID, session: Session) -> Questionnaire:
    questionnaire = session.get(Questionnaire, questionnaire_id)
    if questionnaire is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questionnaire introuvable")
    return questionnaire


def _generer_numero_certificat() -> str:
    annee = datetime.now(timezone.utc).year
    return f"CERT-{annee}-{uuid.uuid4().hex[:8].upper()}"


def _tentative_depassee(
    tentative: Tentative, questionnaire: Questionnaire, maintenant: datetime
) -> bool:
    """Indique si une tentative en cours a dépassé sa durée côté serveur."""
    return (
        questionnaire.temps_limite_secondes is not None
        and maintenant >= tentative.date_debut + timedelta(seconds=questionnaire.temps_limite_secondes)
    )


def _cloturer_tentative_expiree(
    session: Session, tentative: Tentative, maintenant: datetime
) -> None:
    """Évite de réutiliser indéfiniment une ancienne tentative expirée."""
    tentative.statut = StatutTentative.TERMINEE
    tentative.score = 0
    tentative.reussi = False
    tentative.hors_delai = True
    tentative.date_passage = maintenant
    session.add(tentative)


def _vers_tentative_read(session: Session, t: Tentative) -> TentativeRead:
    certificat = session.exec(
        select(Certificat).where(Certificat.tentative_id == t.id)
    ).first()

    utilisateur = session.get(Utilisateur, t.utilisateur_id)

    return TentativeRead(
        **t.model_dump(),
        certificat_id=certificat.id if certificat else None,
        utilisateur_nom=utilisateur.nom if utilisateur else "Inconnu",
        utilisateur_prenom=utilisateur.prenom if utilisateur else "",
    )


# ÉTAPE 1 — DÉMARRER : enregistre l'heure de départ côté serveur.


@router.post(
    "/api/questionnaires/{questionnaire_id}/tentatives/demarrer",
    response_model=TentativeDemarreeRead,
    status_code=status.HTTP_201_CREATED,
)
def demarrer_tentative(
    questionnaire_id: uuid.UUID,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> TentativeDemarreeRead:
    questionnaire = _get_questionnaire_ou_404(questionnaire_id, session)

    
    progression = session.exec(
        select(Progression).where(
            Progression.utilisateur_id == utilisateur.id,
            Progression.formation_id == questionnaire.formation_id,
        )
    ).first()
    if progression is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas affecté à la formation associée à ce questionnaire",
        )

    tentatives_existantes = list(
        session.exec(
            select(Tentative).where(
                Tentative.utilisateur_id == utilisateur.id,
                Tentative.questionnaire_id == questionnaire_id,
            )
        ).all()
    )
    en_cours = next((t for t in tentatives_existantes if t.statut == StatutTentative.EN_COURS), None)
    maintenant = datetime.utcnow()

    # Une tentative abandonnée ne doit jamais être renvoyée au navigateur avec
    # son ancienne heure de départ. Elle est clôturée comme hors délai ; le
    # collaborateur peut ensuite commencer une nouvelle tentative si la règle
    # de nombre maximal le permet.
    if en_cours is not None and _tentative_depassee(en_cours, questionnaire, maintenant):
        _cloturer_tentative_expiree(session, en_cours, maintenant)
        # Si le nombre maximal est atteint juste après, l'état expiré doit tout
        # de même être durablement enregistré avant le retour d'erreur.
        session.commit()
        en_cours = None

    # La limite s'applique à toutes les tentatives du collaborateur pour ce
    # questionnaire, réussies, échouées ou expirées. Une tentative encore en
    # cours reste naturellement accessible afin de ne pas pénaliser une page
    # fermée accidentellement.
    nombre_tentatives_utilisees = len(tentatives_existantes)
    if (
        en_cours is None
        and questionnaire.nombre_tentatives_max is not None
        and nombre_tentatives_utilisees >= questionnaire.nombre_tentatives_max
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Nombre maximal de tentatives atteint "
                f"({questionnaire.nombre_tentatives_max})."
            ),
        )

    if not _contenus_formation_termines(session, utilisateur.id, questionnaire.formation_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Terminez toutes les ressources de la formation avant de passer le quiz",
        )

    progression.date_debut = progression.date_debut or maintenant
    progression.derniere_activite = maintenant
    if progression.statut == StatutProgression.non_commence:
        progression.statut = StatutProgression.en_cours
    session.add(progression)

    if en_cours is not None:
        session.commit()
        return TentativeDemarreeRead(
            tentative_id=en_cours.id,
            date_debut=en_cours.date_debut,
            temps_limite_secondes=questionnaire.temps_limite_secondes,
        )

    tentative = Tentative(
        utilisateur_id=utilisateur.id,
        questionnaire_id=questionnaire_id,
        numero_tentative=len(tentatives_existantes) + 1,
        statut=StatutTentative.EN_COURS,
    )
    session.add(tentative)
    session.commit()
    session.refresh(tentative)

    return TentativeDemarreeRead(
        tentative_id=tentative.id,
        date_debut=tentative.date_debut,
        temps_limite_secondes=questionnaire.temps_limite_secondes,
    )





@router.post(
    "/api/tentatives/{tentative_id}/soumettre",
    response_model=TentativeRead,
)
def soumettre_tentative(
    tentative_id: uuid.UUID,
    donnees: TentativeSoumission,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> TentativeRead:
    tentative = session.get(Tentative, tentative_id)
    if tentative is None or tentative.utilisateur_id != utilisateur.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tentative introuvable")
    if tentative.statut != StatutTentative.EN_COURS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette tentative a déjà été soumise",
        )

    questionnaire = _get_questionnaire_ou_404(tentative.questionnaire_id, session)

    questions = list(
        session.exec(select(Question).where(Question.questionnaire_id == questionnaire.id)).all()
    )
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ce questionnaire ne contient aucune question",
        )

    questions_par_id = {q.id: q for q in questions}
    soumissions = {r.question_id: r.reponse_possible_id for r in donnees.reponses}
    maintenant = datetime.utcnow()
    hors_delai = False
    if questionnaire.temps_limite_secondes is not None:
        ecoule = (maintenant - tentative.date_debut).total_seconds()
        # Le backend reste la référence temporelle. Le signal d'expiration du
        # navigateur évite toutefois qu'une soumission automatique partielle
        # soit rejetée à la frontière exacte de la dernière seconde.
        hors_delai = (
            ecoule >= questionnaire.temps_limite_secondes
            or donnees.expiration_automatique
        )

    if not hors_delai and set(soumissions.keys()) != set(questions_par_id.keys()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Toutes les questions du quiz doivent recevoir exactement une réponse",
        )

    points_obtenus = 0
    points_totaux = 0
    reponses_a_enregistrer: list[ReponseUtilisateur] = []

    if not set(soumissions).issubset(questions_par_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Une réponse concerne une question invalide.",
        )

    for question_id, question in questions_par_id.items():
        points_totaux += question.points
        reponse_possible_id = soumissions.get(question_id)
        if reponse_possible_id is None:
            continue

        reponse_possible = session.get(ReponsePossible, reponse_possible_id)
        if reponse_possible is None or reponse_possible.question_id != question_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Réponse invalide pour la question {question_id}",
            )

        est_correcte = reponse_possible.est_correcte
        if est_correcte:
            points_obtenus += question.points

        reponses_a_enregistrer.append(
            ReponseUtilisateur(
                tentative_id=tentative.id,
                question_id=question_id,
                reponse_possible_id=reponse_possible_id,
                est_correcte=est_correcte,
            )
        )

    score_calcule = round((points_obtenus / points_totaux) * 100) if points_totaux else 0

    # Hors délai : la tentative est automatiquement en échec, quelles que
    # soient les réponses — on n'annule pas la soumission (les réponses
    # restent enregistrées)
    score_final = 0 if hors_delai else score_calcule
    reussi = (not hors_delai) and (score_calcule >= questionnaire.score_minimum_reussite)

    tentative.statut = StatutTentative.TERMINEE
    tentative.score = score_final
    tentative.reussi = reussi
    tentative.hors_delai = hors_delai
    tentative.date_passage = maintenant
    session.add(tentative)

    for r in reponses_a_enregistrer:
        session.add(r)

    progression = session.exec(
        select(Progression).where(
            Progression.utilisateur_id == utilisateur.id,
            Progression.formation_id == questionnaire.formation_id,
        )
    ).first()
    if progression is not None:
        progression.date_debut = progression.date_debut or maintenant
        progression.derniere_activite = maintenant
        if reussi:
            progression.statut = StatutProgression.termine
            progression.pourcentage = 100
            progression.date_fin = maintenant
        elif progression.statut == StatutProgression.non_commence:
            progression.statut = StatutProgression.en_cours
        session.add(progression)

    if reussi:
        certificat = Certificat(
            utilisateur_id=utilisateur.id,
            formation_id=questionnaire.formation_id,
            tentative_id=tentative.id,
            numero_certificat=_generer_numero_certificat(),
        )
        session.add(certificat)

        creer_notification(
            session, utilisateur_id=utilisateur.id, type_=TypeNotification.certificat,
            titre="Certificat obtenu",
            message=f"Vous avez obtenu votre certificat (score : {score_final}%).",
        )
    else:
        message = (
            "Temps écoulé — la tentative est automatiquement en échec."
            if hors_delai
            else f"Score obtenu : {score_final}% (minimum requis : {questionnaire.score_minimum_reussite}%)."
        )
        creer_notification(
            session, utilisateur_id=utilisateur.id, type_=TypeNotification.quiz,
            titre="Quiz non validé", message=message,
        )

    session.commit()
    session.refresh(tentative)

    return _vers_tentative_read(session, tentative)


@router.get("/api/tentatives/mes-tentatives", response_model=list[TentativeRead])
def lister_mes_tentatives(
    questionnaire_id: uuid.UUID | None = Query(default=None),
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> list[TentativeRead]:
    requete = select(Tentative).where(Tentative.utilisateur_id == utilisateur.id)
    if questionnaire_id is not None:
        requete = requete.where(Tentative.questionnaire_id == questionnaire_id)
    return [_vers_tentative_read(session, t) for t in session.exec(requete).all()]


@router.get("/api/tentatives/mes-resultats", response_model=list[ResultatPersonnelRead])
def lister_mes_resultats(
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> list[ResultatPersonnelRead]:
    """Retourne toutes les tentatives du collaborateur avec leur contexte.

    Le frontend n'a ainsi besoin que d'un seul appel pour afficher ses résultats,
    sans devoir charger les questionnaires de chacune de ses formations.
    """
    tentatives = list(
        session.exec(
            select(Tentative).where(Tentative.utilisateur_id == utilisateur.id)
        ).all()
    )
    tentatives.sort(key=lambda tentative: tentative.date_passage or tentative.date_debut, reverse=True)

    resultats: list[ResultatPersonnelRead] = []
    for tentative in tentatives:
        questionnaire = session.get(Questionnaire, tentative.questionnaire_id)
        if questionnaire is None:
            continue
        formation = session.get(Formation, questionnaire.formation_id)
        if formation is None:
            continue

        resultat = _vers_tentative_read(session, tentative)
        resultats.append(
            ResultatPersonnelRead(
                **resultat.model_dump(),
                formation_id=formation.id,
                formation_titre=formation.titre,
                questionnaire_titre=questionnaire.titre,
                score_minimum_reussite=questionnaire.score_minimum_reussite,
            )
        )

    return resultats


@router.get(
    "/api/questionnaires/{questionnaire_id}/tentatives",
    response_model=list[TentativeRead],
    dependencies=[Depends(exiger_administrateur)],
)
def lister_tentatives_questionnaire(
    questionnaire_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> list[TentativeRead]:
    _get_questionnaire_ou_404(questionnaire_id, session)
    tentatives = session.exec(
        select(Tentative).where(Tentative.questionnaire_id == questionnaire_id)
    ).all()
    return [_vers_tentative_read(session, t) for t in tentatives]
