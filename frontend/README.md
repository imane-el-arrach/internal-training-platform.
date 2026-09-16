# Frontend — EXIA Academy

Interface web de la plateforme EXIA Academy, développée avec **React**, **Vite**, **TypeScript** et **Tailwind CSS**. Elle consomme l'API FastAPI du dossier [`../backend`](../backend).

L'application propose un espace public, un espace administrateur et un espace collaborateur. Son identité visuelle est construite autour des couleurs bleu-vert et turquoise d'EXIA Technologies.

## Fonctionnalités visibles

### Espace public

- page d'accueil EXIA Academy ;
- page de connexion ;
- vérification publique d'un certificat partagé.

### Espace administrateur

- tableau de bord et indicateurs de suivi ;
- gestion des utilisateurs, services et affectations ;
- gestion des catégories, formations et contenus ;
- aperçu intégré des vidéos, PDF et présentations ;
- suivi de l'indexation IA des contenus ;
- gestion des questionnaires, questions, banque de questions et résultats ;
- consultation des rapports et exports.

### Espace collaborateur

- consultation des formations affectées ;
- lecture intégrée des vidéos, PDF et PowerPoint ;
- suivi de progression par contenu ;
- assistant IA et commentaires associés à une formation ;
- passage des quiz lorsque les contenus sont terminés ;
- résultats, certificats et historique personnel.

## Prérequis

- Node.js 20 ou supérieur ;
- le backend démarré sur `http://localhost:8000` par défaut ;
- npm, fourni avec Node.js.

## Installation et démarrage

Depuis la racine du dépôt :

```powershell
cd frontend
npm install
```

Créer le fichier `frontend/.env` :

```env
VITE_API_BASE_URL=http://localhost:8000
```

Démarrer ensuite l'application :

```powershell
npm run dev
```

Vite affiche l'adresse locale de l'interface, généralement `http://localhost:5173`.

## Scripts disponibles

```powershell
# Lancement du serveur de développement avec rechargement automatique
npm run dev

# Vérification TypeScript et production du build optimisé
npm run build

# Prévisualisation locale du build généré
npm run preview

```

Avant toute livraison ou tout commit, exécuter systématiquement :

```powershell
npm run build
```

## Organisation du code

```text
frontend/
├── public/
├── src/
│   ├── api/                   # client Axios et modules API par domaine
│   ├── components/            # composants réutilisables
│   ├── components/ui/         # boutons et primitives d'interface
│   ├── context/               # AuthContext : session et utilisateur connecté
│   ├── layouts/               # navigation Admin et Collaborateur
│   ├── pages/                 # écrans publics, admin et collaborateur
│   ├── routes/                # protections d'accès selon le rôle
│   ├── App.tsx                # routage principal
│   ├── index.css              # styles et palette globale EXIA
│   └── main.tsx               # point d'entrée React
├── .env                       # URL locale du backend, non versionnée
├── package.json               # dépendances et scripts npm
└── vite.config.ts             # configuration Vite
```

## Communication avec l'API

`src/api/client.ts` centralise les appels Axios. Il lit la variable `VITE_API_BASE_URL` et ajoute automatiquement le jeton JWT stocké localement aux requêtes authentifiées.

Les erreurs sont uniformisées afin que l'interface affiche des messages utiles :

| Code | Comportement côté interface |
| --- | --- |
| `401` | déconnexion propre et retour vers la page de connexion ; |
| `403` | affichage d'un message de droits insuffisants ; |
| `404` | ressource introuvable ; |
| `409` | conflit métier, par exemple un quiz tenté avant la fin des contenus ; |
| `422` | données saisies invalides ou état non compatible. |

## Routes principales

| Route | Écran | Accès |
| --- | --- | --- |
| `/` | Accueil | Public |
| `/connexion` | Connexion | Public |
| `/certificats/:id` | Vérification de certificat | Public |
| `/admin` | Tableau de bord | Administrateur |
| `/admin/formations` | Catalogue de formations | Administrateur |
| `/admin/contenus` | Gestion des contenus | Administrateur |
| `/admin/questionnaires` | Évaluations et résultats | Administrateur |
| `/admin/utilisateurs` | Utilisateurs et services | Administrateur |
| `/admin/affectations` | Affectations | Administrateur |
| `/espace` | Tableau de bord personnel | Collaborateur |
| `/espace/formations` | Mes formations | Collaborateur |
| `/espace/formations/:formationId` | Détail d'une formation | Collaborateur |
| `/espace/formations/:formationId/quiz/:questionnaireId` | Quiz | Collaborateur |
| `/espace/certificats` | Mes certificats | Collaborateur |

## Bonnes pratiques de contribution

1. Consulter l'architecture existante avant d'ajouter une page ou un appel API.
2. Ajouter les appels serveur dans `src/api/`, sans mélanger cette logique avec les composants visuels.
3. Protéger les nouvelles routes selon le rôle dans `ProtectedRoute` et `App.tsx`.
4. Réutiliser la palette et les composants existants pour préserver l'identité EXIA.
5. Vérifier le projet avec `npm run build` avant de valider une évolution.

Pour la configuration de l'API, de PostgreSQL, de `pgvector` et de l'assistant IA, consulter le [README backend](../backend/README.md). Pour une vue complète du projet, consulter le [README racine](../README.md).
