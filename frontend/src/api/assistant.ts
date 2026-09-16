import { apiClient } from "./client";
import type {
  AssistantReponse,
  Certificat,
  CertificatPublic,
  Commentaire,
  ModeGeneration,
  Notification,
} from "./types";

// Certificats 
export async function mesCertificats(): Promise<Certificat[]> {
  const { data } = await apiClient.get<Certificat[]>("/api/certificats/mes-certificats");
  return data;
}

// Route PUBLIQUE 
export async function certificatPublic(id: string): Promise<CertificatPublic> {
  const { data } = await apiClient.get<CertificatPublic>(`/api/certificats/${id}/public`);
  return data;
}

// Notifications
export async function listerNotifications(lu?: boolean): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>("/api/notifications", {
    params: lu === undefined ? {} : { lu },
  });
  return data;
}

export async function marquerNotificationLue(id: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(`/api/notifications/${id}/lire`);
  return data;
}

export async function compterNotificationsNonLues(): Promise<number> {
  const { data } = await apiClient.get<{ nombre: number }>("/api/notifications/non-lues/nombre");
  return data.nombre;
}

export async function marquerToutesNotificationsLues(): Promise<number> {
  const { data } = await apiClient.patch<{ nombre: number }>("/api/notifications/lire-tout");
  return data.nombre;
}

// Commentaires 
export async function listerCommentaires(formationId: string): Promise<Commentaire[]> {
  const { data } = await apiClient.get<Commentaire[]>(
    `/api/formations/${formationId}/commentaires`
  );
  return data;
}

export async function creerCommentaire(
  formationId: string,
  contenu: string,
  parentId?: string
): Promise<Commentaire> {
  const { data } = await apiClient.post<Commentaire>(
    `/api/formations/${formationId}/commentaires`,
    {
      contenu,
      parent_id: parentId,
    }
  );

  return data;
}

export async function aimerCommentaire(
  formationId: string,
  commentaireId: string
): Promise<Commentaire> {
  const { data } = await apiClient.post<Commentaire>(
    `/api/formations/${formationId}/commentaires/${commentaireId}/likes`
  );

  return data;
}

export async function retirerLikeCommentaire(
  formationId: string,
  commentaireId: string
): Promise<Commentaire> {
  const { data } = await apiClient.delete<Commentaire>(
    `/api/formations/${formationId}/commentaires/${commentaireId}/likes`
  );

  return data;
}

export async function supprimerCommentaire(formationId: string, commentaireId: string): Promise<void> {
  await apiClient.delete(`/api/formations/${formationId}/commentaires/${commentaireId}`);
}

// --- Assistant IA ---
export async function poserQuestionAssistant(
  formationId: string,
  question: string
): Promise<AssistantReponse> {
  const { data } = await apiClient.post<AssistantReponse>(
    `/api/formations/${formationId}/assistant/question`,
    { question }
  );
  return data;
}

export async function genererAssistant(
  contenuId: string,
  mode: ModeGeneration,
  options: { nombre_points?: number; nombre_questions?: number } = {}
): Promise<AssistantReponse> {
  const { data } = await apiClient.post<AssistantReponse>(
    `/api/contenus/${contenuId}/assistant/generer`,
    options,
    { params: { mode } }
  );
  return data;
}
export async function listerCertificatsAdmin(): Promise<Certificat[]> {
  const { data } = await apiClient.get<Certificat[]>("/api/certificats");
  return data;
}