import { apiClient } from "./client";
import type {
  QuestionAdmin,
  QuestionQuiz,
  Questionnaire,
  Tentative,
} from "./types";

export interface QuestionnairePayload {
  titre: string;
  score_minimum_reussite: number;
  nombre_tentatives_max?: number | null;
  temps_limite_secondes?: number | null;
}

export interface ReponsePayload {
  texte: string;
  est_correcte: boolean;
  ordre: number;
}

export interface QuestionPayload {
  enonce: string;
  ordre: number;
  points: number;
  reponses: ReponsePayload[];
}

export async function listerQuestionnaires(
  formationId: string
): Promise<Questionnaire[]> {
  const { data } = await apiClient.get<Questionnaire[]>(
    `/api/formations/${formationId}/questionnaires`
  );
  return data;
}

export async function creerQuestionnaire(
  formationId: string,
  payload: QuestionnairePayload
): Promise<Questionnaire> {
  const { data } = await apiClient.post<Questionnaire>(
    `/api/formations/${formationId}/questionnaires`,
    payload
  );
  return data;
}

export async function modifierQuestionnaire(
  formationId: string,
  questionnaireId: string,
  payload: Partial<QuestionnairePayload>
): Promise<Questionnaire> {
  const { data } = await apiClient.patch<Questionnaire>(
    `/api/formations/${formationId}/questionnaires/${questionnaireId}`,
    payload
  );
  return data;
}

export async function supprimerQuestionnaire(
  formationId: string,
  questionnaireId: string
): Promise<void> {
  await apiClient.delete(
    `/api/formations/${formationId}/questionnaires/${questionnaireId}`
  );
}

export async function listerQuestionsAdmin(
  questionnaireId: string
): Promise<QuestionAdmin[]> {
  const { data } = await apiClient.get<QuestionAdmin[]>(
    `/api/questionnaires/${questionnaireId}/questions`
  );
  return data;
}

export async function listerQuestionsQuiz(
  questionnaireId: string
): Promise<QuestionQuiz[]> {
  const { data } = await apiClient.get<QuestionQuiz[]>(
    `/api/questionnaires/${questionnaireId}/questions/quiz`
  );
  return data;
}

export async function creerQuestion(
  questionnaireId: string,
  payload: QuestionPayload
): Promise<QuestionAdmin> {
  const { data } = await apiClient.post<QuestionAdmin>(
    `/api/questionnaires/${questionnaireId}/questions`,
    payload
  );
  return data;
}

export async function modifierQuestion(
  questionnaireId: string,
  questionId: string,
  payload: Partial<QuestionPayload>
): Promise<QuestionAdmin> {
  const { data } = await apiClient.patch<QuestionAdmin>(
    `/api/questionnaires/${questionnaireId}/questions/${questionId}`,
    payload
  );
  return data;
}

export async function supprimerQuestion(
  questionnaireId: string,
  questionId: string
): Promise<void> {
  await apiClient.delete(
    `/api/questionnaires/${questionnaireId}/questions/${questionId}`
  );
}

export async function listerTentativesQuestionnaire(
  questionnaireId: string
): Promise<Tentative[]> {
  const { data } = await apiClient.get<Tentative[]>(
    `/api/questionnaires/${questionnaireId}/tentatives`
  );
  return data;
}
export async function modifierReponsesQuestion(
  questionnaireId: string,
  questionId: string,
  reponses: ReponsePayload[]
): Promise<void> {
  await apiClient.patch(
    `/api/questionnaires/${questionnaireId}/questions/${questionId}/reponses`,
    { reponses }
  );
}

export async function creerQuestionsLot(
  questionnaireId: string,
  questions: QuestionPayload[]
): Promise<QuestionAdmin[]> {
  const { data } = await apiClient.post<QuestionAdmin[]>(
    `/api/questionnaires/${questionnaireId}/questions/lot`,
    { questions }
  );
  return data;
}