export type Role = "administrateur" | "collaborateur";

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  poste: string | null;
  departement_id: string | null;
  actif: boolean;
  date_creation: string;
}

export interface Categorie {
  id: string;
  nom: string;
  description: string | null;
  couleur: string | null;
  date_creation: string;
}

export interface Formation {
  id: string;
  titre: string;
  description: string | null;
  categorie_id: string;
  obligatoire: boolean;
  actif: boolean;
  duree_estimee_minutes: number | null;
  date_creation: string;
  date_modification: string;
}

export type TypeContenu = "video" | "pdf" | "presentation" | "lien" | "document";
export type StatutIngestion =
  | "en_attente"
  | "en_cours"
  | "terminee"
  | "echec"
  | "non_indexable";

export interface Contenu {
  id: string;
  formation_id: string;
  type: TypeContenu;
  titre: string;
  chemin_fichier: string;
  ordre: number;
  duree_secondes: number | null;
  statut_ingestion: StatutIngestion;
  date_indexation: string | null;
  erreur_ingestion: string | null;
  date_creation: string;
}

export type StatutProgression = "non_commence" | "en_cours" | "termine";

export interface Progression {
  id: string;
  utilisateur_id: string;
  formation_id: string;
  affectation_id: string;
  statut: StatutProgression;
  pourcentage: number;
  date_debut: string | null;
  date_fin: string | null;
  derniere_activite: string | null;
}
export interface EtatProgressionContenus {
  formation_id: string;
  contenu_ids_termines: string[];
}
export interface Questionnaire {
  id: string;
  formation_id: string;
  titre: string;
  score_minimum_reussite: number;
  nombre_tentatives_max: number | null;
  temps_limite_secondes: number | null;
  date_creation: string;
}

export interface ReponsePossibleAdmin {
  id: string;
  texte: string;
  est_correcte: boolean;
  ordre: number;
}

export interface ReponsePossiblePublic {
  id: string;
  texte: string;
  ordre: number;
}

export interface QuestionAdmin {
  id: string;
  questionnaire_id: string;
  enonce: string;
  ordre: number;
  points: number;
  reponses: ReponsePossibleAdmin[];
}

export interface QuestionQuiz {
  id: string;
  enonce: string;
  ordre: number;
  points: number;
  reponses: ReponsePossiblePublic[];
}

export interface TentativeDemarree {
  tentative_id: string;
  date_debut: string;
  temps_limite_secondes: number | null;
}

export interface Tentative {
  id: string;
  utilisateur_id: string;
  utilisateur_nom: string;
  utilisateur_prenom: string;
  questionnaire_id: string;
  numero_tentative: number;
  statut: "en_cours" | "terminee";
  score: number | null;
  reussi: boolean | null;
  hors_delai: boolean;
  date_debut: string;
  date_passage: string | null;
  certificat_id: string | null;
}

export interface ResultatPersonnel extends Tentative {
  formation_id: string;
  formation_titre: string;
  questionnaire_titre: string;
  score_minimum_reussite: number;
}

export interface Certificat {
  id: string;
  utilisateur_id: string;
  formation_id: string;
  tentative_id: string | null;
  numero_certificat: string;
  fichier_pdf: string | null;
  date_obtention: string;
  date_expiration: string | null;
}

export interface CertificatPublic {
  nom_complet: string;
  formation_titre: string;
  score: number | null;
  date_obtention: string;
  numero_certificat: string;
  valide: boolean;
}

export type TypeNotification = "formation" | "quiz" | "certificat" | "rappel" | "systeme";

export interface Notification {
  id: string;
  type: TypeNotification;
  titre: string;
  message: string | null;
  lien: string | null;
  lu: boolean;
  date_creation: string;
}

export interface Commentaire {
  id: string;
  formation_id: string;
  utilisateur_id: string;
  parent_id: string | null;
  auteur_nom: string;
  auteur_prenom: string;
  contenu: string;
  date_creation: string;
  date_modification: string | null;
  nb_likes: number;
  aime_par_moi: boolean;
}

export type ModeGeneration =
  | "resume"
  | "explication_simple"
  | "points_cles"
  | "quiz"
  | "questions_revision";

export interface FragmentUtilise {
  fragment_id: string;
  contenu_id: string;
  texte: string;
  score_similarite: number | null;
}

export interface QuestionCreatePropose {
  enonce: string;
  points: number;
  reponses: { texte: string; est_correcte: boolean }[];
}

export interface AssistantReponse {
  mode: string;
  reponse: string;
  fragments_utilises: FragmentUtilise[];
  quiz_propose: QuestionCreatePropose[] | null;
}
