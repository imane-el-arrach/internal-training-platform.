import { apiClient } from "./client";
import type { Progression } from "./types";

export interface AffectationCreatePayload {
  formation_id: string;
  utilisateur_id?: string;
  departement_id?: string;
  date_limite?: string;
}

export interface AffectationRead {
  id: string;
  formation_id: string;
  utilisateur_id: string | null;
  departement_id: string | null;
  affecte_par: string;
  date_affectation: string;
  date_limite: string | null;
  nombre_progressions_generees: number;
}

export async function creerAffectation(payload: AffectationCreatePayload): Promise<AffectationRead> {
  const { data } = await apiClient.post<AffectationRead>("/api/affectations", payload);
  return data;
}

export async function listerAffectations(filtres: {
  formation_id?: string;
  departement_id?: string;
  utilisateur_id?: string;
} = {}): Promise<AffectationRead[]> {
  const { data } = await apiClient.get<AffectationRead[]>("/api/affectations", { params: filtres });
  return data;
}

export async function supprimerAffectation(id: string): Promise<void> {
  await apiClient.delete(`/api/affectations/${id}`);
}

export async function mesProgressions(): Promise<Progression[]> {
  const { data } = await apiClient.get<Progression[]>("/api/progressions/mes-formations");
  return data;
}

export async function listerProgressions(filtres: {
  formation_id?: string;
  utilisateur_id?: string;
} = {}): Promise<Progression[]> {
  const { data } = await apiClient.get<Progression[]>("/api/progressions", { params: filtres });
  return data;
}
