import { apiClient } from "./client";
import type {
  Contenu,
  EtatProgressionContenus,
  TypeContenu,
} from "./types";

export async function listerContenus(
  formationId: string
): Promise<Contenu[]> {
  const { data } = await apiClient.get<Contenu[]>(
    `/api/formations/${formationId}/contenus`
  );

  return data;
}

export interface ContenuCreatePayload {
  type: TypeContenu;
  titre: string;
  fichier?: File;
  url?: string;
  ordre?: number;
  duree_secondes?: number;
}

export interface ContenuUpdatePayload {
  titre?: string;
  ordre?: number;
  duree_secondes?: number;
}

export async function creerContenu(
  formationId: string,
  payload: ContenuCreatePayload
): Promise<Contenu> {
  const formData = new FormData();

  formData.append("type", payload.type);
  formData.append("titre", payload.titre);

  if (payload.ordre !== undefined) {
    formData.append("ordre", String(payload.ordre));
  }

  if (payload.duree_secondes !== undefined) {
    formData.append("duree_secondes", String(payload.duree_secondes));
  }

  if (payload.type === "lien") {
    if (!payload.url) {
      throw new Error("Une URL est obligatoire pour un contenu de type lien.");
    }

    formData.append("url", payload.url);
  } else {
    if (!payload.fichier) {
      throw new Error("Un fichier est obligatoire pour ce type de contenu.");
    }

    formData.append("fichier", payload.fichier);
  }

  const { data } = await apiClient.post<Contenu>(
    `/api/formations/${formationId}/contenus`,
    formData
  );

  return data;
}

export async function modifierContenu(
  formationId: string,
  contenuId: string,
  payload: ContenuUpdatePayload
): Promise<Contenu> {
  const formData = new FormData();
  if (payload.titre !== undefined) formData.append("titre", payload.titre);
  if (payload.ordre !== undefined) formData.append("ordre", String(payload.ordre));
  if (payload.duree_secondes !== undefined) formData.append("duree_secondes", String(payload.duree_secondes));

  const { data } = await apiClient.patch<Contenu>(
    `/api/formations/${formationId}/contenus/${contenuId}`,
    formData
  );
  return data;
}

export async function supprimerContenu(formationId: string, contenuId: string): Promise<void> {
  await apiClient.delete(`/api/formations/${formationId}/contenus/${contenuId}`);
}

export async function lancerIngestion(
  contenuId: string
): Promise<{ contenu_id: string; message: string }> {
  const { data } = await apiClient.post(
    `/api/contenus/${contenuId}/ingerer`
  );

  return data;
}

export async function statutIngestion(
  contenuId: string
): Promise<{ contenu_id: string; nombre_fragments: number }> {
  const { data } = await apiClient.get(
    `/api/contenus/${contenuId}/chunks/statut`
  );

  return data;
}

export async function terminerContenu(
  contenuId: string,
  dureeConsulteeSecondes: number
): Promise<void> {
  await apiClient.post(
    `/api/progressions/contenus/${contenuId}/terminer`,
    { duree_consultee_secondes: Math.ceil(dureeConsulteeSecondes) }
  );
}

export async function lireProgressionContenus(
  formationId: string
): Promise<EtatProgressionContenus> {
  const { data } = await apiClient.get<EtatProgressionContenus>(
    `/api/progressions/formations/${formationId}/contenus`
  );

  return data;
}

/**
 * Déclenche le téléchargement d'un contenu via un Blob authentifié.
 * L'attribut `download` d'un <a> est ignoré en cross-origin, donc on
 * fetch le fichier avec le JWT, on crée un blob URL, puis on simule
 * un clic. Le nom de fichier provient du header Content-Disposition
 * posé par le backend (dérivé du titre du contenu).
 */
export async function telechargerContenu(
  formationId: string,
  contenuId: string
): Promise<void> {
  const reponse = await apiClient.get<Blob>(
    `/api/formations/${formationId}/contenus/${contenuId}/telecharger`,
    { responseType: "blob" }
  );

  const nomFallback = `contenu-${contenuId}`;
  const nomFichier = extraireNomFichier(reponse.headers, nomFallback);

  const blobUrl = window.URL.createObjectURL(reponse.data);
  const lien = document.createElement("a");
  lien.href = blobUrl;
  lien.download = nomFichier;
  lien.style.display = "none";
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  window.URL.revokeObjectURL(blobUrl);
}

/**
 * Charge un PPTX uniquement pour l'aperçu intégré. Cette route réutilise le
 * client Axios (JWT + CORS déjà centralisés) et évite un fetch direct vers le
 * répertoire statique, qui peut être bloqué selon l'origine du navigateur.
 */
export async function chargerContenuPourApercu(
  formationId: string,
  contenuId: string
): Promise<ArrayBuffer> {
  const reponse = await apiClient.get<ArrayBuffer>(
    `/api/formations/${formationId}/contenus/${contenuId}/telecharger`,
    { responseType: "arraybuffer" }
  );

  return reponse.data;
}

function extraireNomFichier(
  headers: Record<string, unknown>,
  fallback: string
): string {
  // Axios peut renvoyer les headers en minuscules ou via .get()
  const get = (key: string): string | undefined => {
    const direct = headers[key];
    if (typeof direct === "string") return direct;
    const lower = headers[key.toLowerCase()];
    if (typeof lower === "string") return lower;
    return undefined;
  };

  const disposition = get("content-disposition");
  if (!disposition) return fallback;

  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  if (!match || !match[1]) return fallback;

  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}
