import axios, { AxiosError } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Attache le token JWT à chaque requête, si présent 
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Callback injecté par AuthContext pour réagir à un 401 global 
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status ?? 0;
    const detailServeur = error.response?.data?.detail;

    if (status === 401) {
      // Session expirée ou invalide : on déconnecte proprement 
      onUnauthorized?.();
      return Promise.reject(
        new ApiError("Votre session a expiré. Reconnectez-vous pour continuer.", 401)
      );
    }

    if (status === 403) {
      return Promise.reject(
        new ApiError(
          detailServeur ?? "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
          403
        )
      );
    }

    if (status === 404) {
      return Promise.reject(new ApiError(detailServeur ?? "Ressource introuvable.", 404));
    }

    if (status === 409) {
      return Promise.reject(new ApiError(detailServeur ?? "Conflit avec l'état actuel.", 409));
    }

    if (status === 422) {
      return Promise.reject(
        new ApiError(detailServeur ?? "Certaines informations saisies sont invalides.", 422)
      );
    }

    if (status === 0) {
      return Promise.reject(
        new ApiError("Impossible de contacter le serveur. Vérifiez votre connexion.", 0)
      );
    }

    return Promise.reject(
      new ApiError(detailServeur ?? "Une erreur inattendue est survenue.", status)
    );
  }
);
