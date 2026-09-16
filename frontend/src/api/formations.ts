import { apiClient } from "./client";
import type { Categorie, Formation } from "./types";

export interface FormationsFiltres {
  actif?: boolean;
  categorie_id?: string;
  obligatoire?: boolean;
}

export async function listerFormations(filtres: FormationsFiltres = {}): Promise<Formation[]> {
  const { data } = await apiClient.get<Formation[]>("/api/formations", { params: filtres });
  return data;
}

export async function obtenirFormation(id: string): Promise<Formation> {
  const { data } = await apiClient.get<Formation>(`/api/formations/${id}`);
  return data;
}

export interface FormationCreatePayload {
  titre: string;
  description?: string | null;
  categorie_id: string;
  obligatoire?: boolean;
  duree_estimee_minutes?: number;
}

export interface FormationUpdatePayload {
  titre?: string;
  description?: string | null;
  categorie_id?: string;
  obligatoire?: boolean;
  duree_estimee_minutes?: number | null;
}

export async function creerFormation(payload: FormationCreatePayload): Promise<Formation> {
  const { data } = await apiClient.post<Formation>("/api/formations", payload);
  return data;
}

export async function modifierFormation(
  id: string,
  payload: FormationUpdatePayload
): Promise<Formation> {
  const { data } = await apiClient.patch<Formation>(`/api/formations/${id}`, payload);
  return data;
}

export async function desactiverFormation(id: string): Promise<void> {
  await apiClient.delete(`/api/formations/${id}`);
}

export async function supprimerFormationDefinitivement(id: string): Promise<void> {
  await apiClient.delete(`/api/formations/${id}/supprimer-definitivement`);
}

export async function reactiverFormation(id: string): Promise<Formation> {
  const { data } = await apiClient.post<Formation>(`/api/formations/${id}/reactiver`);
  return data;
}

export async function listerCategories(): Promise<Categorie[]> {
  const { data } = await apiClient.get<Categorie[]>("/api/categories");
  return data;
}

export async function creerCategorie(payload: {
  nom: string;
  description?: string;
  couleur?: string;
}): Promise<Categorie> {
  const { data } = await apiClient.post<Categorie>("/api/categories", payload);
  return data;
}
