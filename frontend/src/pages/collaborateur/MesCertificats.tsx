import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Download, Eye, Trophy } from "lucide-react";
import { mesCertificats } from "../../api/assistant";
import { API_BASE_URL } from "../../api/client";
import { listerFormations } from "../../api/formations";
import { EmptyState, LoadingState } from "../../components/ui/Primitives";

export function MesCertificats() {
  const [copie, setCopie] = useState<string | null>(null);

  const { data: certificats = [], isLoading } = useQuery({
    queryKey: ["mes-certificats"],
    queryFn: mesCertificats,
  });

  const { data: formations = [] } = useQuery({
    queryKey: ["formations"],
    queryFn: () => listerFormations(),
  });

  async function copierLien(certificatId: string) {
    await navigator.clipboard.writeText(
      `${window.location.origin}/certificats/${certificatId}`
    );

    setCopie(certificatId);
    window.setTimeout(() => setCopie(null), 2500);
  }

  return (
    <div>
      <div className="max-w-2xl">
        <span className="section-kicker">
          <i /> MES RÉUSSITES
        </span>

        <h1 className="mt-4 font-display text-4xl font-medium tracking-[-0.06em] text-ink md:text-6xl">
          Mes certificats
        </h1>

        <p className="mt-5 text-sm leading-relaxed text-ink/60">
          Vos certificats sont disponibles en téléchargement ou partage dès leur émission.
        </p>
      </div>

      {isLoading && (
        <LoadingState message="Chargement des certificats…" />
      )}

      <div className="mt-9 grid gap-4 md:grid-cols-2">
        {certificats.map((certificat) => {
          const formation = formations.find(
            (element) => element.id === certificat.formation_id
          );

          return (
            <article
              key={certificat.id}
              className="relative overflow-hidden rounded-xl border border-line bg-white p-6"
            >
              <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-[#e7f0ef]" />

              <div className="relative">
                <div className="grid h-12 w-12 place-items-center rounded-full border border-[#49bfa9] text-[#315864]">
                  <Trophy size={22} />
                </div>

                <span className="mt-7 block text-[9px] font-bold tracking-[0.15em] text-[#315864]">
                  CERTIFICATION EXIA
                </span>

                <h2 className="mt-3 font-display text-2xl font-medium tracking-[-0.04em] text-ink">
                  {formation?.titre ?? "Formation"}
                </h2>

                <p className="mt-3 text-xs leading-relaxed text-ink/55">
                  Certificat obtenu le{" "}
                  {new Date(certificat.date_obtention).toLocaleDateString("fr-FR")} ·{" "}
                  {certificat.numero_certificat}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <a
                    href={`${API_BASE_URL}/api/certificats/${certificat.id}/public/pdf/apercu`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-bold text-[#315864] hover:border-[#315864]"
                  >
                    <Eye size={14} />
                    Voir
                  </a>

                  <a
                    href={`${API_BASE_URL}/api/certificats/${certificat.id}/public/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-bold text-[#315864] hover:border-[#315864]"
                  >
                    <Download size={14} />
                    Télécharger
                  </a>

                  <button
                    type="button"
                    onClick={() => void copierLien(certificat.id)}
                    className="inline-flex items-center gap-2 rounded-md bg-[#315864] px-3 py-2 text-xs font-bold text-white hover:bg-[#1f3e47]"
                  >
                    {copie === certificat.id ? <Check size={14} /> : <Copy size={14} />}
                    {copie === certificat.id ? "Lien copié" : "Partager"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {!isLoading && certificats.length === 0 && (
          <EmptyState
            icon={<Trophy size={22} />}
            titre="Votre prochaine réussite"
            message="Terminez une formation et réussissez son quiz pour obtenir votre premier certificat."
          />
        )}
      </div>
    </div>
  );
}
