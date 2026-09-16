# Architecture frontend — EXIA Academy

## Objectif

Le frontend est une application React/Vite qui propose deux espaces séparés :

- **Administration** : gestion du catalogue, de la population et du pilotage.
- **Collaborateur** : parcours de formation, quiz, certificats, assistant IA
  et échanges autour d'une formation.

Le backend FastAPI reste la source de vérité pour les utilisateurs, les
formations, la progression, les évaluations et les contenus indexés par l'IA.

## Démarrage

Depuis le dossier `frontend` :

```bash
npm install
npm run dev
```

L'URL du backend est définie par `VITE_API_BASE_URL` dans `frontend/.env`.
En développement local, elle vaut normalement `http://localhost:8000`.

Avant un commit, exécuter :

```bash
npm run build
```

## Organisation du code

```text
frontend/
├── public/                 # ressources publiques, dont le logo EXIA
├── src/
│   ├── api/                # un module par domaine d'API FastAPI
│   ├── components/         # composants partagés et identité visuelle
│   ├── context/            # état global de session
│   ├── layouts/            # structures de navigation par rôle
│   ├── pages/              # écrans, organisés par rôle
│   │   ├── admin/
│   │   └── collaborateur/
│   ├── routes/             # protection des routes
│   ├── App.tsx             # table de routage principale
│   ├── index.css           # styles globaux et palette EXIA
│   └── main.tsx            # point d'entrée React
├── .env                    # configuration locale non versionnée
└── package.json            # scripts et dépendances
```

## Identité visuelle

La plateforme utilise l'identité EXIA Academy :

- vert foncé principal : `#315864` ;
- turquoise d'accent : `#49BFA9` ;
- fond vert très clair : `#E7F0EF` ;
- texte foncé : `#17262A`.

Le logo public est chargé depuis `public/logo-exia.png`. Les nouvelles pages
doivent réutiliser cette palette et les composants existants plutôt que créer
une identité parallèle.

## Authentification et sécurité

`src/context/AuthContext.tsx` gère la session. Il conserve le jeton JWT,
charge le profil connecté et fournit les opérations de connexion/déconnexion.

`src/api/client.ts` centralise Axios et ajoute automatiquement le jeton
`Authorization: Bearer ...` aux requêtes authentifiées. Il transforme aussi
les erreurs HTTP en messages utilisables dans l'interface.

`src/routes/ProtectedRoute.tsx` protège les routes selon le rôle :

| Rôle          | Préfixe d'URL                              | Layout                  |
| -------------- | ------------------------------------------- | ----------------------- |
| Administrateur | `/admin`                                  | `AdminLayout`         |
| Collaborateur  | `/espace`                                 | `CollaborateurLayout` |
| Public         | `/`, `/connexion`, `/certificats/:id` | Aucun                   |

## Routes principales

| Route                                                     | Écran                                 | Rôle          |
| --------------------------------------------------------- | -------------------------------------- | -------------- |
| `/`                                                     | Accueil                                | Public         |
| `/connexion`                                            | Connexion                              | Public         |
| `/certificats/:id`                                      | Vérification publique d'un certificat | Public         |
| `/admin`                                                | Vue d'ensemble                         | Administrateur |
| `/admin/formations`                                     | Catalogue de formations                | Administrateur |
| `/admin/contenus`                                       | Ressources et statut d'indexation IA   | Administrateur |
| `/admin/questionnaires`                                 | Évaluations et résultats             | Administrateur |
| `/admin/utilisateurs`                                   | Population                             | Administrateur |
| `/admin/affectations`                                   | Affectations                           | Administrateur |
| `/espace`                                               | Tableau de bord personnel              | Collaborateur  |
| `/espace/formations`                                    | Mes formations                         | Collaborateur  |
| `/espace/formations/:formationId`                       | Détail d'une formation                | Collaborateur  |
| `/espace/formations/:formationId/quiz/:questionnaireId` | Quiz                                   | Collaborateur  |
| `/espace/certificats`                                   | Mes certificats                        | Collaborateur  |

## Modules API

| Module                    | Responsabilité                                          |
| ------------------------- | -------------------------------------------------------- |
| `api/auth.ts`           | Connexion et profil connecté                            |
| `api/client.ts`         | Client HTTP, JWT et erreurs uniformes                    |
| `api/formations.ts`     | Formations et catégories                                |
| `api/contenus.ts`       | Upload, contenus, indexation et progression par contenu  |
| `api/affectations.ts`   | Affectations et progressions                             |
| `api/questionnaires.ts` | Questionnaires, questions et tentatives admin            |
| `api/tentatives.ts`     | Démarrage et soumission de quiz                         |
| `api/assistant.ts`      | Assistant IA, certificats, commentaires et notifications |
| `api/utilisateurs.ts`   | Utilisateurs et départements                            |

## Flux importants

### Ajout et indexation d'un contenu

1. L'administrateur ajoute une ressource via `/admin/contenus`.
2. Le backend enregistre le contenu puis lance l'indexation en arrière-plan.
3. Le frontend affiche le statut : programmé, en cours, terminé, en erreur ou
   non indexable.
4. Une fois terminé, la ressource peut alimenter l'assistant IA.

### Progression d'un collaborateur

1. Le collaborateur ouvre une formation affectée.
2. Il marque une ressource comme terminée.
3. Le backend recalcule le pourcentage de la formation.
4. Les tableaux de bord et la liste des formations utilisent cette progression.

### Évaluation et certification

1. L'administrateur crée un questionnaire et ses questions.
2. Le collaborateur commence puis soumet une tentative.
3. Le backend vérifie les réponses, le score et le délai.
4. En cas de réussite, la progression passe à 100 % et un certificat est créé.

## Règles de contribution Git

Chaque fonctionnalité utilise une branche dédiée, par exemple :

```bash
git switch -c feat/evaluations-admin
```

Avant le commit :

```bash
cd frontend
npm run build
cd ..
git status
git diff --staged
```

Les commits doivent être regroupés par responsabilité, par exemple :

```text
feat(admin): gere les evaluations et les resultats
feat(ia): affiche le suivi d indexation des contenus
feat(progressions): affiche l avancement par contenu
fix(frontend): corrige les appels React Query
docs(frontend): documente l architecture EXIA Academy
```
