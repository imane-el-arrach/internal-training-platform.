import { apiClient } from "./client";
import type { Role, Utilisateur } from "./types";

export interface Departement {
  id: string;
  nom: string;
  description: string | null;
  date_creation: string;
}

export async function listerDepartements(): Promise<Departement[]> {
  const { data } = await apiClient.get<Departement[]>("/api/departements");
  return data;
}

export async function creerDepartement(nom: string, description?: string): Promise<Departement> {
  const { data } = await apiClient.post<Departement>("/api/departements", { nom, description });
  return data;
}

export async function supprimerDepartement(id: string): Promise<void> {
  await apiClient.delete(`/api/departements/${id}`);
}

export async function listerUtilisateurs(actif?: boolean): Promise<Utilisateur[]> {
  const { data } = await apiClient.get<Utilisateur[]>("/api/utilisateurs", {
    params: actif === undefined ? {} : { actif },
  });
  return data;
}

export interface UtilisateurCreatePayload {
  nom: string;
  prenom: string;
  email: string;
  mot_de_passe: string;
  role?: Role;
  poste?: string;
  departement_id?: string;
}

export interface UtilisateurUpdatePayload {
  nom?: string;
  prenom?: string;
  email?: string;
  mot_de_passe?: string;
  role?: Role;
  poste?: string | null;
  departement_id?: string | null;
}

export async function creerUtilisateur(payload: UtilisateurCreatePayload): Promise<Utilisateur> {
  const { data } = await apiClient.post<Utilisateur>("/api/utilisateurs", payload);
  return data;
}

export async function modifierUtilisateur(
  id: string,
  payload: UtilisateurUpdatePayload
): Promise<Utilisateur> {
  const { data } = await apiClient.patch<Utilisateur>(`/api/utilisateurs/${id}`, payload);
  return data;
}

export async function desactiverUtilisateur(id: string): Promise<void> {
  await apiClient.delete(`/api/utilisateurs/${id}`);
}

export async function supprimerUtilisateurDefinitivement(id: string): Promise<void> {
  await apiClient.delete(`/api/utilisateurs/${id}/supprimer-definitivement`);
}

export async function reactiverUtilisateur(id: string): Promise<Utilisateur> {
  const { data } = await apiClient.post<Utilisateur>(`/api/utilisateurs/${id}/reactiver`);
  return data;
}
