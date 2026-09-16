import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { certificatPublic } from "../api/assistant";
import { API_BASE_URL, ApiError } from "../api/client";
import { Spinner } from "../components/ui/Primitives";

export function CertificatPublicPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["certificat-public", id],
    queryFn: () => certificatPublic(id!),
    enabled: !!id,
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-12 print:bg-white">
      {isLoading && <Spinner className="h-6 w-6 text-verdigris" />}

      {error && (
        <p className="text-sm text-rust">
          {error instanceof ApiError ? error.message : "Certificat introuvable."}
        </p>
      )}

      {data && (
        <div className="w-full max-w-lg rounded-card border-2 border-brass bg-surface p-10 text-center shadow-sm print:border print:shadow-none">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">
            Certificat de réussite
          </p>

          <h1 className="mt-6 font-display text-3xl font-medium text-ink">{data.nom_complet}</h1>

          <p className="mt-4 text-sm text-ink/60">a complété avec succès la formation</p>
          <p className="mt-1 font-display text-xl font-medium text-verdigris">
            {data.formation_titre}
          </p>

          <div className="mt-6 flex justify-center gap-8 border-t border-line pt-6 text-sm">
            {data.score !== null && (
              <div>
                <p className="text-ink/50">Score</p>
                <p className="mt-1 font-mono font-medium text-ink">{data.score}%</p>
              </div>
            )}
            <div>
              <p className="text-ink/50">Date</p>
              <p className="mt-1 font-mono font-medium text-ink">
                {new Date(data.date_obtention).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${data.valide ? "bg-verdigris" : "bg-rust"}`}
            />
            <span
              className={`font-mono text-xs ${data.valide ? "text-verdigris-dark" : "text-rust"}`}
            >
              {data.valide ? "Certificat valide" : "Certificat expiré"}
            </span>
          </div>

          <p className="mt-6 font-mono text-[11px] text-ink/40">{data.numero_certificat}</p>

          <a
            href={`${API_BASE_URL}/api/certificats/${id}/public/pdf`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block text-xs font-medium text-ink/50 underline hover:text-verdigris print:hidden"
          >
            Ouvrir le certificat PDF officiel
          </a>
        </div>
      )}
    </div>
  );
}
