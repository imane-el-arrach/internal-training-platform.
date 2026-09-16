import { apiClient } from "./client";

export type StatutRapport = "non_commence" | "en_cours" | "termine";

export interface ResultatIndividuel {
  utilisateur_id: string;
  utilisateur_nom: string;
  utilisateur_prenom: string;
  departement_nom: string | null;
  formation_id: string;
  formation_titre: string;
  formation_obligatoire: boolean;
  statut: StatutRapport;
  pourcentage: number;
  date_limite: string | null;
  derniere_activite: string | null;
}

export interface RapportSuivi {
  collaborateurs_concernes: number;
  progressions_total: number;
  progressions_terminees: number;
  formations_en_attente: number;
  progressions_en_cours: number;
  taux_completion: number;
  taux_reussite: number | null;
  taux_conformite: number | null;
  resultats: ResultatIndividuel[];
}

export async function consulterRapportSuivi(filtres: {
  formation_id?: string;
  departement_id?: string;
} = {}): Promise<RapportSuivi> {
  const { data } = await apiClient.get<RapportSuivi>("/api/rapports/suivi", {
    params: filtres,
  });
  return data;
}

export async function telechargerRapportSuiviCsv(filtres: {
  formation_id?: string;
  departement_id?: string;
} = {}): Promise<void> {
  const { data } = await apiClient.get<Blob>("/api/rapports/suivi/export/csv", {
    params: filtres,
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(data);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = "exia-academy-suivi.csv";
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  window.URL.revokeObjectURL(url);
}

export async function telechargerRapportSuiviExcel(filtres: {
  formation_id?: string;
  departement_id?: string;
} = {}): Promise<void> {
  const { data } = await apiClient.get<Blob>("/api/rapports/suivi/export/excel", {
    params: filtres,
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(data);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = "exia-academy-suivi.xlsx";
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  window.URL.revokeObjectURL(url);
}

export async function telechargerRapportSuiviPdf(filtres: {
  formation_id?: string;
  departement_id?: string;
} = {}): Promise<void> {
  const { data } = await apiClient.get<Blob>("/api/rapports/suivi/export/pdf", {
    params: filtres,
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(data);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = "exia-academy-suivi.pdf";
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  window.URL.revokeObjectURL(url);
}
