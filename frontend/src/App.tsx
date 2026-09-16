import { Navigate, Route, Routes } from "react-router-dom";
import { Accueil } from "./pages/Accueil";
import { Connexion } from "./pages/Connexion";
import { CertificatPublicPage } from "./pages/CertificatPublicPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AdminLayout } from "./layouts/AdminLayout";
import { CollaborateurLayout } from "./layouts/CollaborateurLayout";
import { Formations } from "./pages/admin/Formations";
import { Utilisateurs } from "./pages/admin/Utilisateurs";
import { Affectations } from "./pages/admin/Affectations";
import { MesFormations } from "./pages/collaborateur/MesFormations";
import { FormationDetail } from "./pages/collaborateur/FormationDetail";
import { PasserQuiz } from "./pages/collaborateur/PasserQuiz";
import { MesCertificats } from "./pages/collaborateur/MesCertificats";
import { HistoriqueFormations } from "./pages/collaborateur/HistoriqueFormations";
import { MesResultats } from "./pages/collaborateur/MesResultats";
import { DashboardCollaborateur } from "./pages/collaborateur/DashboardCollaborateur";
import { DashboardAdmin } from "./pages/admin/DashboardAdmin";
import { Contenus } from "./pages/admin/Contenus";
import { Questionnaires } from "./pages/admin/Questionnaires";
import { Resultats } from "./pages/admin/Resultats";
import { ScrollToTopButton } from "./components/ScrollToTopButton";

export default function App() {
  return (
    <>
      <Routes>
      <Route path="/" element={<Accueil />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/certificats/:id" element={<CertificatPublicPage />} />

      <Route element={<ProtectedRoute rolesAutorises={["administrateur"]} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardAdmin />} />
          <Route path="/admin/formations" element={<Formations />} />
          <Route path="/admin/utilisateurs" element={<Utilisateurs />} />
          <Route path="/admin/affectations" element={<Affectations />} />
          <Route path="/admin/contenus" element={<Contenus />} />
          <Route path="/admin/questionnaires" element={<Questionnaires />} />
          <Route path="/admin/resultats" element={<Resultats />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute rolesAutorises={["collaborateur"]} />}>
        <Route element={<CollaborateurLayout />}>
          <Route path="/espace" element={<DashboardCollaborateur />} />
          <Route path="/espace/formations" element={<MesFormations />} />
          <Route path="/espace/formations/:formationId" element={<FormationDetail />} />
          <Route
            path="/espace/formations/:formationId/quiz/:questionnaireId"
            element={<PasserQuiz />}
          />
          <Route path="/espace/certificats" element={<MesCertificats />} />
          <Route path="/espace/historique" element={<HistoriqueFormations />} />
          <Route path="/espace/resultats" element={<MesResultats />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ScrollToTopButton />
    </>
  );
}
