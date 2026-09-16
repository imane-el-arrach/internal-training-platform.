"""Crée des données de démonstration réalistes pour EXIA Academy.

Le script est idempotent et local : aucune donnée existante n'est supprimée.
Il ne modifie pas les mots de passe des comptes déjà existants et n'ajoute des
questions qu'aux questionnaires de démonstration encore vides.

Exécution :
    python -m scripts.initialiser_donnees_demonstration

Mot de passe des comptes créés : ExiaDemo2026!
"""

from datetime import date, timedelta

from sqlmodel import Session, select

from app.core.security import hash_mot_de_passe
from app.db.session import engine
from app.models.affectation import Affectation
from app.models.departement import Departement
from app.models.formation import Formation
from app.models.progression import Progression, StatutProgression
from app.models.question import Question
from app.models.questionnaire import Questionnaire
from app.models.reponse_possible import ReponsePossible
from app.models.utilisateur import RoleUtilisateur, Utilisateur
from scripts.initialiser_catalogue_formations import initialiser_catalogue


MOT_DE_PASSE_DEMO = "ExiaDemo2026!"

DEPARTEMENTS = {
    "Opérations BPO": "Pilotage et exécution des opérations externalisées.",
    "Relation Client": "Accompagnement et qualité de la relation avec les clients.",
    "Systèmes et Support": "Support informatique, outils métiers et maintien des services.",
    "Finance et Conformité": "Contrôle, conformité et traitement des opérations financières.",
}

UTILISATEURS = [
    ("Samira", "Benali", "samira.benali@demo.exia.ma", "Chargée d'opérations", "Opérations BPO"),
    ("Yassine", "El Idrissi", "yassine.elidrissi@demo.exia.ma", "Superviseur d'équipe", "Opérations BPO"),
    ("Nora", "Amrani", "nora.amrani@demo.exia.ma", "Conseillère clientèle", "Relation Client"),
    ("Mehdi", "Alaoui", "mehdi.alaoui@demo.exia.ma", "Responsable qualité", "Relation Client"),
    ("Imane", "Khalil", "imane.khalil@demo.exia.ma", "Technicienne support", "Systèmes et Support"),
    ("Omar", "Tazi", "omar.tazi@demo.exia.ma", "Administrateur systèmes", "Systèmes et Support"),
    ("Salma", "Fassi", "salma.fassi@demo.exia.ma", "Analyste conformité", "Finance et Conformité"),
    ("Rayan", "Berrada", "rayan.berrada@demo.exia.ma", "Contrôleur de gestion", "Finance et Conformité"),
]

# Chaque tuple : objectif, bon réflexe, mauvais réflexes plausibles.
THEMES_QUIZ = {
    "Sensibilisation à la sécurité des systèmes d'information": (
        "réduire les risques qui pèsent sur les systèmes d'information",
        "signaler rapidement tout comportement ou incident suspect",
        ["partager ses identifiants en cas d'urgence", "désactiver les protections du poste", "ignorer une alerte de sécurité"],
    ),
    "Bonnes pratiques informatiques": (
        "utiliser les outils informatiques de façon sûre et responsable",
        "verrouiller sa session dès que son poste est sans surveillance",
        ["installer des logiciels sans validation", "laisser son poste ouvert", "utiliser un compte partagé"],
    ),
    "Phishing et ingénierie sociale": (
        "reconnaître et signaler les tentatives de fraude",
        "vérifier l'expéditeur et le lien avant de cliquer",
        ["transmettre son mot de passe par e-mail", "ouvrir toute pièce jointe reçue", "répondre immédiatement à une demande urgente"],
    ),
    "Gestion des mots de passe": (
        "protéger les accès aux outils et données de l'entreprise",
        "utiliser un mot de passe unique et robuste pour chaque service",
        ["réutiliser le même mot de passe partout", "noter son mot de passe sur son écran", "partager son mot de passe avec un collègue"],
    ),
    "Protection des données": (
        "garantir la confidentialité des données personnelles et professionnelles",
        "ne collecter et partager que les données nécessaires",
        ["envoyer des données sensibles sans vérification", "conserver toutes les données indéfiniment", "diffuser une liste de contacts sans raison"],
    ),
    "Classification des informations": (
        "adapter la protection au niveau de sensibilité de l'information",
        "respecter les règles de stockage et de partage associées à chaque niveau",
        ["traiter toute information comme publique", "partager un document sensible sans contrôle", "ignorer le marquage de confidentialité"],
    ),
    "Sécurité de la messagerie électronique": (
        "utiliser la messagerie professionnelle sans exposer l'entreprise aux risques",
        "contrôler les destinataires et les pièces jointes avant l'envoi",
        ["ouvrir systématiquement les pièces jointes", "cliquer sur tout lien reçu", "envoyer un message sensible au mauvais destinataire"],
    ),
    "Utilisation sécurisée d'Internet": (
        "naviguer de manière responsable et limiter l'exposition aux risques",
        "vérifier la fiabilité et la sécurité d'un site avant de transmettre des données",
        ["saisir ses identifiants sur tout site", "télécharger un fichier inconnu", "ignorer les alertes du navigateur"],
    ),
    "Télétravail sécurisé": (
        "préserver la sécurité des informations lors du travail à distance",
        "utiliser une connexion sécurisée et verrouiller ses équipements",
        ["travailler sur un réseau Wi-Fi public sans protection", "partager son poste professionnel", "laisser des documents confidentiels visibles"],
    ),
    "Sensibilisation à la sécurité incendie": (
        "prévenir les départs de feu et protéger les personnes",
        "alerter immédiatement selon la procédure prévue",
        ["retourner chercher ses affaires", "bloquer un accès de secours", "attendre sans prévenir personne"],
    ),
    "Consignes d'évacuation": (
        "évacuer les lieux rapidement et en sécurité en cas d'urgence",
        "rejoindre calmement le point de rassemblement indiqué",
        ["utiliser l'ascenseur", "retourner à son poste", "quitter le site sans se signaler"],
    ),
    "Utilisation des extincteurs": (
        "connaître les règles essentielles d'utilisation d'un extincteur",
        "choisir un extincteur adapté sans se mettre en danger",
        ["intervenir seul sur un feu important", "utiliser n'importe quel extincteur", "se placer dos à la sortie"],
    ),
}


def obtenir_ou_creer_departement(session: Session, nom: str, description: str) -> Departement:
    departement = session.exec(select(Departement).where(Departement.nom == nom)).first()
    if departement is None:
        departement = Departement(nom=nom, description=description)
    else:
        departement.description = description
    session.add(departement)
    session.flush()
    return departement


def obtenir_ou_creer_utilisateur(
    session: Session, prenom: str, nom: str, email: str, poste: str, departement: Departement
) -> tuple[Utilisateur, bool]:
    utilisateur = session.exec(select(Utilisateur).where(Utilisateur.email == email)).first()
    if utilisateur is not None:
        return utilisateur, False

    utilisateur = Utilisateur(
        prenom=prenom,
        nom=nom,
        email=email,
        poste=poste,
        departement_id=departement.id,
        role=RoleUtilisateur.collaborateur,
        mot_de_passe_hash=hash_mot_de_passe(MOT_DE_PASSE_DEMO),
        actif=True,
    )
    session.add(utilisateur)
    return utilisateur, True


def obtenir_admin_demo(session: Session) -> tuple[Utilisateur, bool]:
    email = "admin.demo@demo.exia.ma"
    admin = session.exec(select(Utilisateur).where(Utilisateur.email == email)).first()
    if admin is not None:
        return admin, False

    admin = Utilisateur(
        prenom="Admin",
        nom="Démonstration",
        email=email,
        poste="Administrateur EXIA Academy",
        role=RoleUtilisateur.administrateur,
        mot_de_passe_hash=hash_mot_de_passe(MOT_DE_PASSE_DEMO),
        actif=True,
    )
    session.add(admin)
    session.flush()
    return admin, True


def creer_questions(session: Session, questionnaire: Questionnaire, formation: Formation) -> int:
    if session.exec(select(Question).where(Question.questionnaire_id == questionnaire.id)).first():
        return 0

    objectif, reflexe, erreurs = THEMES_QUIZ[formation.titre]
    questions = [
        (f"Quel est l'objectif principal de la formation « {formation.titre} » ?", objectif),
        (f"Quel bon réflexe faut-il appliquer dans le cadre de cette formation ?", reflexe),
        ("Quelle pratique doit être évitée ?", erreurs[0]),
    ]
    nombre = 0
    for ordre, (enonce, bonne_reponse) in enumerate(questions, start=1):
        question = Question(questionnaire_id=questionnaire.id, enonce=enonce, ordre=ordre, points=1)
        session.add(question)
        session.flush()

        if ordre == 3:
            reponses = [(bonne_reponse, True), (reflexe, False), (erreurs[1], False), (erreurs[2], False)]
        else:
            reponses = [(bonne_reponse, True), *[(erreur, False) for erreur in erreurs]]
        for numero, (texte, est_correcte) in enumerate(reponses, start=1):
            session.add(ReponsePossible(question_id=question.id, texte=texte, est_correcte=est_correcte, ordre=numero))
        nombre += 1
    return nombre


def obtenir_ou_creer_questionnaire(session: Session, formation: Formation) -> tuple[Questionnaire, bool]:
    titre = f"Évaluation — {formation.titre}"
    questionnaire = session.exec(
        select(Questionnaire).where(
            Questionnaire.formation_id == formation.id,
            Questionnaire.titre == titre,
        )
    ).first()
    if questionnaire is not None:
        questionnaire.temps_limite_secondes = 5 * 60
        session.add(questionnaire)
        return questionnaire, False

    questionnaire = Questionnaire(
        formation_id=formation.id,
        titre=titre,
        score_minimum_reussite=70,
        nombre_tentatives_max=3,
        temps_limite_secondes=5 * 60,
    )
    session.add(questionnaire)
    session.flush()
    return questionnaire, True


def affecter_formation_departement(
    session: Session, formation: Formation, departement: Departement, admin: Utilisateur
) -> int:
    affectation = session.exec(
        select(Affectation).where(
            Affectation.formation_id == formation.id,
            Affectation.departement_id == departement.id,
        )
    ).first()
    if affectation is None:
        affectation = Affectation(
            formation_id=formation.id,
            departement_id=departement.id,
            affecte_par=admin.id,
            date_limite=date.today() + timedelta(days=90),
        )
        session.add(affectation)
        session.flush()

    utilisateurs = list(
        session.exec(
            select(Utilisateur).where(
                Utilisateur.departement_id == departement.id,
                Utilisateur.actif == True,  # noqa: E712
                Utilisateur.role == RoleUtilisateur.collaborateur,
            )
        ).all()
    )
    creees = 0
    for utilisateur in utilisateurs:
        progression = session.exec(
            select(Progression).where(
                Progression.utilisateur_id == utilisateur.id,
                Progression.formation_id == formation.id,
            )
        ).first()
        if progression is None:
            session.add(
                Progression(
                    utilisateur_id=utilisateur.id,
                    formation_id=formation.id,
                    affectation_id=affectation.id,
                    statut=StatutProgression.non_commence,
                    pourcentage=0,
                )
            )
            creees += 1
    return creees


def initialiser_donnees() -> dict[str, int]:
    initialiser_catalogue()
    compteurs = {"departements": 0, "utilisateurs": 0, "questionnaires": 0, "questions": 0, "affectations": 0, "progressions": 0}

    with Session(engine) as session:
        services: dict[str, Departement] = {}
        for nom, description in DEPARTEMENTS.items():
            existait = session.exec(select(Departement).where(Departement.nom == nom)).first()
            services[nom] = obtenir_ou_creer_departement(session, nom, description)
            if existait is None:
                compteurs["departements"] += 1

        admin, admin_cree = obtenir_admin_demo(session)
        if admin_cree:
            compteurs["utilisateurs"] += 1

        for prenom, nom, email, poste, service in UTILISATEURS:
            _, cree = obtenir_ou_creer_utilisateur(session, prenom, nom, email, poste, services[service])
            if cree:
                compteurs["utilisateurs"] += 1
        session.flush()

        formations = list(session.exec(select(Formation).where(Formation.actif == True)).all())  # noqa: E712
        for formation in formations:
            if formation.titre not in THEMES_QUIZ:
                continue
            questionnaire, cree = obtenir_ou_creer_questionnaire(session, formation)
            if cree:
                compteurs["questionnaires"] += 1
            compteurs["questions"] += creer_questions(session, questionnaire, formation)

            if formation.titre in {
                "Protection des données",
            }:
                cibles = [services["Finance et Conformité"], services["Opérations BPO"]]
            elif formation.titre in {
                "Sensibilisation à la sécurité incendie",
                "Consignes d'évacuation",
                "Utilisation des extincteurs",
            }:
                cibles = list(services.values())
            else:
                cibles = [services["Opérations BPO"], services["Relation Client"], services["Systèmes et Support"]]

            for departement in cibles:
                avant = session.exec(
                    select(Affectation).where(
                        Affectation.formation_id == formation.id,
                        Affectation.departement_id == departement.id,
                    )
                ).first()
                compteurs["progressions"] += affecter_formation_departement(session, formation, departement, admin)
                if avant is None:
                    compteurs["affectations"] += 1

        session.commit()
    return compteurs


if __name__ == "__main__":
    compteurs = initialiser_donnees()
    print("Données de démonstration prêtes :")
    for nom, nombre in compteurs.items():
        print(f"- {nombre} {nom}")
    print(f"Comptes de démonstration : mot de passe unique {MOT_DE_PASSE_DEMO}")
