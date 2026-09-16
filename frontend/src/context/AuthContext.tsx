import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMonProfil, login as loginApi } from "../api/auth";
import { setOnUnauthorized } from "../api/client";
import type { Utilisateur } from "../api/types";

interface AuthContextValue {
  utilisateur: Utilisateur | null;
  chargementInitial: boolean;
  erreurConnexion: string | null;
  seConnecter: (email: string, motDePasse: string) => Promise<Utilisateur>;
  seDeconnecter: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargementInitial, setChargementInitial] = useState(true);
  const [erreurConnexion, setErreurConnexion] = useState<string | null>(null);

  const seDeconnecter = () => {
    localStorage.removeItem("access_token");
    setUtilisateur(null);
  };

  // Au premier chargement : si un token existe déjà, on vérifie qu'il est
  // toujours valide en rechargeant le profil.
  useEffect(() => {
    setOnUnauthorized(seDeconnecter);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setChargementInitial(false);
      return;
    }

    getMonProfil()
      .then(setUtilisateur)
      .catch(() => {
        localStorage.removeItem("access_token");
      })
      .finally(() => setChargementInitial(false));
  }, []);

  const seConnecter = async (email: string, motDePasse: string): Promise<Utilisateur> => {
    setErreurConnexion(null);
    try {
      const { access_token } = await loginApi(email, motDePasse);
      localStorage.setItem("access_token", access_token);
      const profil = await getMonProfil();
      setUtilisateur(profil);
      return profil;
    } catch {
      const message = "Email ou mot de passe incorrect.";
      setErreurConnexion(message);
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{ utilisateur, chargementInitial, erreurConnexion, seConnecter, seDeconnecter }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>");
  return ctx;
}
