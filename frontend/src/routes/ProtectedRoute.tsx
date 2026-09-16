import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../api/types";

interface ProtectedRouteProps {
  rolesAutorises?: Role[];
}

export function ProtectedRoute({ rolesAutorises }: ProtectedRouteProps) {
  const { utilisateur, chargementInitial } = useAuth();

  if (chargementInitial) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="font-sans text-sm text-ink/60">Chargement…</p>
      </div>
    );
  }

  if (!utilisateur) {
    return <Navigate to="/connexion" replace />;
  }

  if (rolesAutorises && !rolesAutorises.includes(utilisateur.role)) {
    const destination = utilisateur.role === "administrateur" ? "/admin" : "/espace";
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
