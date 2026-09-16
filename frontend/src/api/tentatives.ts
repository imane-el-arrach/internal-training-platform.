import { apiClient } from "./client";
import type { ResultatPersonnel, Tentative, TentativeDemarree } from "./types";

export async function demarrerTentative(questionnaireId: string): Promise<TentativeDemarree> {
  const { data } = await apiClient.post<TentativeDemarree>(
    `/api/questionnaires/${questionnaireId}/tentatives/demarrer`
  );
  return data;
}

export interface ReponseSoumise {
  question_id: string;
  reponse_possible_id: string;
}

export async function soumettreTentative(
  tentativeId: string,
  reponses: ReponseSoumise[],
  expirationAutomatique = false
): Promise<Tentative> {
  const { data } = await apiClient.post<Tentative>(`/api/tentatives/${tentativeId}/soumettre`, {
    reponses,
    expiration_automatique: expirationAutomatique,
  });
  return data;
}

export async function mesTentatives(questionnaireId?: string): Promise<Tentative[]> {
  const { data } = await apiClient.get<Tentative[]>("/api/tentatives/mes-tentatives", {
    params: questionnaireId ? { questionnaire_id: questionnaireId } : {},
  });
  return data;
}

export async function mesResultats(): Promise<ResultatPersonnel[]> {
  const { data } = await apiClient.get<ResultatPersonnel[]>("/api/tentatives/mes-resultats");
  return data;
}
