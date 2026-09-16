import { apiClient } from "./client";
import type { Utilisateur } from "./types";

export interface TokenReponse {
  access_token: string;
  token_type: string;
}

export async function login(email: string, motDePasse: string): Promise<TokenReponse> {
  
  const corps = new URLSearchParams();
  corps.set("username", email);
  corps.set("password", motDePasse);

  const { data } = await apiClient.post<TokenReponse>("/api/auth/login", corps, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

export async function getMonProfil(): Promise<Utilisateur> {
  const { data } = await apiClient.get<Utilisateur>("/api/utilisateurs/me");
  return data;
}
