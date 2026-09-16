import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Bell,
  BookOpen,
  CheckCheck,
  Clock,
  Info,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  compterNotificationsNonLues,
  listerNotifications,
  marquerNotificationLue,
  marquerToutesNotificationsLues,
} from "../api/assistant";
import type { TypeNotification } from "../api/types";
import { cn } from "../lib/utils";

const ICONES_TYPE: Record<TypeNotification, LucideIcon> = {
  formation: BookOpen,
  quiz: ShieldCheck,
  certificat: Award,
  rappel: Clock,
  systeme: Info,
};

const COULEURS_TYPE: Record<TypeNotification, string> = {
  formation: "bg-verdigris-light text-verdigris",
  quiz: "bg-brass-light text-brass",
  certificat: "bg-[#d8f5ef] text-[#21665a]",
  rappel: "bg-amber-50 text-amber-600",
  systeme: "bg-ink/5 text-ink/60",
};

function tempsRelatif(dateIso: string): string {
  const maintenant = Date.now();
  const date = new Date(dateIso).getTime();
  const diff = Math.floor((maintenant - date) / 1000);

  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(dateIso).toLocaleDateString("fr-FR");
}

interface NotificationBellProps {
  variant: "admin" | "collaborateur";
}

export function NotificationBell({ variant }: NotificationBellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Les deux espaces utilisent un en-tête clair : l'icône doit donc rester
  // contrastée, y compris dans l'administration.
  const couleurIcone =
    variant === "admin"
      ? "text-[#315864] hover:text-[#49bfa9]"
      : "text-[#315864] hover:text-[#49bfa9]";

  const { data: nombreNonLues = 0 } = useQuery({
    queryKey: ["notifications-non-lues"],
    queryFn: compterNotificationsNonLues,
    refetchInterval: 30_000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listerNotifications(),
    enabled: ouvert,
  });

  useEffect(() => {
    if (!ouvert) return;

    function handleClickExterieur(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOuvert(false);
      }
    }

    document.addEventListener("mousedown", handleClickExterieur);
    return () => document.removeEventListener("mousedown", handleClickExterieur);
  }, [ouvert]);

  const marquerLue = useMutation({
    mutationFn: (id: string) => marquerNotificationLue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-non-lues"] });
    },
  });

  const toutMarquerLue = useMutation({
    mutationFn: marquerToutesNotificationsLues,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-non-lues"] });
    },
  });

  function gererClicNotification(
    id: string,
    lien: string | null,
    lu: boolean,
  ) {
    if (!lu) {
      marquerLue.mutate(id);
    }

    setOuvert(false);

    if (lien) {
      navigate(lien);
    }
  }

  const notificationsAffichees = notifications.slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((etat) => !etat)}
        className={cn("relative transition-colors", couleurIcone)}
        aria-label={`Notifications${nombreNonLues > 0 ? ` (${nombreNonLues} non lues)` : ""}`}
      >
        <Bell size={18} />
        {nombreNonLues > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rust px-1 text-[9px] font-bold text-white">
            {nombreNonLues > 9 ? "9+" : nombreNonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-line bg-white shadow-xl animate-[dropdown-in_0.15s_ease-out]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-ink/55">
              NOTIFICATIONS
            </span>

            {nombreNonLues > 0 && (
              <button
                type="button"
                onClick={() => toutMarquerLue.mutate()}
                disabled={toutMarquerLue.isPending}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-verdigris transition-colors hover:text-verdigris-dark disabled:opacity-50"
              >
                <CheckCheck size={13} />
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notificationsAffichees.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell size={28} className="text-ink/20" />
                <p className="text-xs text-ink/45">
                  Aucune notification pour le moment.
                </p>
              </div>
            ) : (
              notificationsAffichees.map((notification) => {
                const Icone = ICONES_TYPE[notification.type] ?? Info;
                const couleur = COULEURS_TYPE[notification.type] ?? COULEURS_TYPE.systeme;

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() =>
                      gererClicNotification(
                        notification.id,
                        notification.lien,
                        notification.lu,
                      )
                    }
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors hover:bg-paper",
                      !notification.lu && "bg-verdigris-light/40",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                        couleur,
                      )}
                    >
                      <Icone size={15} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink">
                        {notification.titre}
                      </p>

                      {notification.message && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink/55">
                          {notification.message}
                        </p>
                      )}

                      <p className="mt-1 text-[10px] text-ink/40">
                        {tempsRelatif(notification.date_creation)}
                      </p>
                    </div>

                    {!notification.lu && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rust" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
