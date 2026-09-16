import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Award,
  BookOpen,
  ClipboardCheck,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BrandLogo } from "../components/BrandLogo";
import { AssistantButton } from "../components/AssistantButton";
import { NotificationBell } from "../components/NotificationBell";

const liens = [
  { to: "/espace", label: "Mon espace", icon: LayoutDashboard, fin: true },
  { to: "/espace/formations", label: "Mes formations", icon: BookOpen },
  { to: "/espace/historique", label: "Mon historique", icon: History },
  { to: "/espace/resultats", label: "Mes résultats", icon: ClipboardCheck },
  { to: "/espace/certificats", label: "Mes certificats", icon: Award },
];

export function CollaborateurLayout() {
  const { utilisateur, seDeconnecter } = useAuth();
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7faf9]">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 flex w-[250px] flex-col border-r border-white/10 bg-[linear-gradient(165deg,#315864_0%,#214955_58%,#17313a_100%)] px-[17px] py-[26px] text-white shadow-[8px_0_28px_rgba(23,49,58,0.10)] transition-transform md:translate-x-0",
          menuOuvert ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-2 pb-12">
          <BrandLogo inverse />

          <button
            type="button"
            className="text-white/65 hover:text-white md:hidden"
            onClick={() => setMenuOuvert(false)}
            aria-label="Fermer le menu"
          >
            <X size={19} />
          </button>
        </div>

        <span className="px-2 pb-3 font-mono text-[9px] font-bold tracking-[0.16em] text-white/45">
          MON PARCOURS
        </span>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {liens.map((lien) => {
            const Icone = lien.icon;

            return (
              <NavLink
                key={lien.to}
                to={lien.to}
                end={lien.fin}
                onClick={() => setMenuOuvert(false)}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-md px-[10px] py-3 text-[12px] font-medium transition-colors",
                    isActive
                      ? "bg-[#49bfa9] text-[#17313a] shadow-sm"
                      : "text-white/65 hover:bg-white/10 hover:text-white",
                  ].join(" ")
                }
              >
                <Icone size={17} />
                {lien.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto pt-5">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <span className="px-2 font-mono text-[9px] font-bold tracking-[0.16em] text-[#8ee3d4]">
              ASSISTANT IA
            </span>
            <div className="mt-1">
              <AssistantButton variant="collaborateur" mode="sidebar" darkSidebar />
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="flex items-center gap-3 px-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#49bfa9] text-[11px] font-bold text-[#17313a]">
                {utilisateur?.prenom?.charAt(0).toUpperCase() ?? "E"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {utilisateur?.prenom} {utilisateur?.nom}
                </p>
                <p className="text-[10px] text-white/55">Collaborateur</p>
              </div>
            </div>

            <button
              type="button"
              onClick={seDeconnecter}
              className="mt-4 flex w-full items-center gap-3 rounded-md px-[10px] py-3 text-[12px] text-white/65 hover:bg-red-400/15 hover:text-red-200"
            >
              <LogOut size={17} />
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[250px]">
        <header className="flex h-[74px] items-center gap-4 border-b border-line bg-white/90 px-5 shadow-[0_1px_0_rgba(49,88,100,0.04)] md:px-[52px]">
          <button
            type="button"
            className="text-ink md:hidden"
            onClick={() => setMenuOuvert(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={21} />
          </button>

          <span className="font-mono text-[10px] font-bold tracking-[0.1em] text-ink/45">
            EXIA ACADEMY <span className="mx-2 text-line">/</span> ESPACE COLLABORATEUR
          </span>

          <div className="ml-auto flex items-center gap-4">
            <NotificationBell variant="collaborateur" />

            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#315864] text-[11px] font-bold text-white">
              {utilisateur?.prenom?.charAt(0).toUpperCase() ?? "E"}
            </div>
          </div>
        </header>

        <main className="max-w-[1160px] px-5 py-9 md:px-[52px] md:py-[70px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
