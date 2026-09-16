import { apiClient } from "./client";

export interface ReponseBanque {
  id: string;
  texte: string;
  est_correcte: boolean;
  ordre: number;
}

export interface QuestionBanque {
  id: string;
  enonce: string;
  points: number;
  date_creation: string;
  reponses: ReponseBanque[];
}

export async function listerBanqueQuestions(): Promise<QuestionBanque[]> {
  const { data } = await apiClient.get<QuestionBanque[]>("/api/banque-questions");
  return data;
}

export async function ajouterQuestionDansBanque(questionId: string): Promise<QuestionBanque> {
  const { data } = await apiClient.post<QuestionBanque>(`/api/banque-questions/depuis-question/${questionId}`);
  return data;
}

export async function ajouterQuestionBanqueAuQuestionnaire(questionBanqueId: string, questionnaireId: string): Promise<void> {
  await apiClient.post(`/api/banque-questions/${questionBanqueId}/ajouter-au-questionnaire/${questionnaireId}`);
}

export async function supprimerQuestionBanque(questionBanqueId: string): Promise<void> {
  await apiClient.delete(`/api/banque-questions/${questionBanqueId}`);
}
