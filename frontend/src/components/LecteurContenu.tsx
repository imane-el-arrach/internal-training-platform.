import { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  Presentation,
  X,
} from "lucide-react";
import type { Contenu } from "../api/types";
import { API_BASE_URL } from "../api/client";
import { chargerContenuPourApercu, telechargerContenu } from "../api/contenus";
import { cn } from "../lib/utils";
import { formaterDureeContenu } from "../lib/duree";

interface LecteurContenuProps {
  contenu: Contenu | null;
  ouvert: boolean;
  surFermeture: () => void;
  surComplet: (contenuId: string, dureeConsulteeSecondes: number) => void;
  /** Identifiant de la formation parente, nécessaire pour l'endpoint de téléchargement. */
  formationId: string;
  /** Désactive toute mesure et tout enregistrement de progression pour l'aperçu admin. */
  activerSuivi?: boolean;
}

const SEUIL_VALIDATION_MANUELLE = 0.9;
const SEUIL_COMPLETION_AUTOMATIQUE = 1;
const DUREE_DOCUMENT_DEFAUT = 60;

function urlContenu(contenu: Contenu): string {
  return `${API_BASE_URL}/uploads/${contenu.chemin_fichier}`;
}

function estPdf(contenu: Contenu): boolean {
  return contenu.type === "pdf" || contenu.chemin_fichier.toLowerCase().endsWith(".pdf");
}

function estPresentation(contenu: Contenu): boolean {
  return contenu.type === "presentation";
}

export function LecteurContenu({
  contenu,
  ouvert,
  surFermeture,
  surComplet,
  formationId,
  activerSuivi = true,
}: LecteurContenuProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const presentationRef = useRef<HTMLDivElement>(null);
  const [maxAtteint, setMaxAtteint] = useState(0);
  const [duree, setDuree] = useState(0);
  const [estTermineAuto, setEstTermineAuto] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [telechargementEnCours, setTelechargementEnCours] = useState(false);
  const [erreurTelechargement, setErreurTelechargement] = useState<string | null>(null);
  const [documentPret, setDocumentPret] = useState(false);
  const [tempsLectureDocument, setTempsLectureDocument] = useState(0);
  const [modePleinEcran, setModePleinEcran] = useState(false);

  // Réinitialiser l'état à chaque ouverture
  useEffect(() => {
    if (ouvert) {
      setMaxAtteint(0);
      setDuree(0);
      setEstTermineAuto(false);
      setChargement(true);
      setErreur(null);
      setTelechargementEnCours(false);
      setErreurTelechargement(null);
      setDocumentPret(false);
      setTempsLectureDocument(0);
      setModePleinEcran(false);
    }
  }, [ouvert, contenu?.id]);

  // Mettre en pause la vidéo à la fermeture
  useEffect(() => {
    if (!ouvert && videoRef.current) {
      videoRef.current.pause();
    }
  }, [ouvert]);

  // Fermer avec Escape
  useEffect(() => {
    if (!ouvert) return;
    function gererTouche(event: KeyboardEvent) {
      if (event.key === "Escape") surFermeture();
    }
    document.addEventListener("keydown", gererTouche);
    return () => document.removeEventListener("keydown", gererTouche);
  }, [ouvert, surFermeture]);

  // Verrouiller le scroll de la page derrière
  useEffect(() => {
    if (ouvert) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [ouvert]);

  // Calcul de la progression (utilisé par le useEffect d'auto-complétion)
  const progressionBrute = duree > 0 ? Math.min(maxAtteint / duree, 1) : 0;
  const estDocument = contenu ? estPdf(contenu) || estPresentation(contenu) : false;
  const dureeDocument = contenu?.duree_secondes ?? DUREE_DOCUMENT_DEFAUT;
  const progressionDocument = estDocument
    ? Math.min(tempsLectureDocument / dureeDocument, 1)
    : 0;

  /**
   * La durée définie par l'administrateur est la référence conservée par le
   * backend. La durée réelle lue par le navigateur peut légèrement différer
   * (métadonnées vidéo, encodage). On convertit donc le pourcentage réellement
   * atteint dans l'unité attendue par l'API afin que 90 % et la fin de la vidéo
   * valident le contenu de la même manière qu'un PDF ou une présentation.
   */
  function dureeVideoPourValidation(tempsVideo: number): number {
    const dureeReference = contenu?.duree_secondes ?? duree;
    if (!duree || !dureeReference) return Math.ceil(tempsVideo);

    return Math.ceil(Math.min(tempsVideo / duree, 1) * dureeReference);
  }

  // La fin complète valide automatiquement. Dès 90 %, le collaborateur peut
  // aussi confirmer manuellement qu'il a terminé la ressource.
  useEffect(() => {
    if (
      activerSuivi &&
      ouvert &&
      contenu &&
      (contenu.type === "video"
        ? progressionBrute >= SEUIL_COMPLETION_AUTOMATIQUE
        : estDocument && progressionDocument >= SEUIL_COMPLETION_AUTOMATIQUE) &&
      !estTermineAuto
    ) {
      setEstTermineAuto(true);
      surComplet(
        contenu.id,
        contenu.type === "video"
          ? dureeVideoPourValidation(duree)
          : tempsLectureDocument,
      );
    }
  }, [
    ouvert,
    contenu,
    progressionBrute,
    progressionDocument,
    estDocument,
    estTermineAuto,
    surComplet,
  ]);

  // Les documents n'exposent pas leur position de lecture au navigateur.
  // On mesure donc uniquement le temps où le lecteur est ouvert, chargé et
  // visible, comme on mesure le temps réellement visionné pour une vidéo.
  useEffect(() => {
    if (!activerSuivi || !ouvert || !contenu || !estDocument || !documentPret || estTermineAuto) {
      return undefined;
    }

    const intervalle = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setTempsLectureDocument((temps) => Math.min(temps + 1, dureeDocument));
      }
    }, 1000);

    return () => window.clearInterval(intervalle);
  }, [ouvert, contenu, estDocument, documentPret, estTermineAuto, dureeDocument]);

  // Le module de prévisualisation ne charge le PPTX qu'à l'ouverture du
  // lecteur. Aucun texte du document n'est envoyé au frontend applicatif ou
  // à l'assistant IA : il est rendu localement dans le navigateur.
  useEffect(() => {
    if (!ouvert || !contenu || !estPresentation(contenu) || !presentationRef.current) {
      return undefined;
    }

    const presentationActive = contenu;
    let annule = false;
    const conteneur = presentationRef.current;
    conteneur.replaceChildren();
    setDocumentPret(false);
    setErreur(null);

    if (!presentationActive.chemin_fichier.toLowerCase().endsWith(".pptx")) {
      setErreur(
        "La lecture intégrée prend en charge les présentations .pptx. Téléchargez ce fichier ou convertissez-le en .pptx.",
      );
      return undefined;
    }

    async function chargerPresentation() {
      try {
        const [module, donnees] = await Promise.all([
          import("pptx-preview"),
          chargerContenuPourApercu(formationId, presentationActive.id),
        ]);
        if (annule) return;

        // Le modal vient juste d'être affiché : attendre une frame garantit que
        // ses dimensions sont disponibles avant de dimensionner le rendu PPTX.
        await new Promise<void>((resoudre) => {
          window.requestAnimationFrame(() => resoudre());
        });
        if (annule) return;

        const apercu = module.init(conteneur, {
          width: Math.max(conteneur.clientWidth - 32, 320),
          height: Math.max(conteneur.clientHeight - 32, 180),
          // Les diapositives restent toutes consultables par défilement dans
          // la plateforme. La zone du lecteur est limitée, donc la barre de
          // progression ne disparaît pas sous le contenu.
          mode: "list",
        });
        await apercu.preview(donnees);

        if (!annule) setDocumentPret(true);
      } catch (cause) {
        if (!annule) {
          setErreur(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger cette présentation.",
          );
        }
      }
    }

    void chargerPresentation();
    return () => {
      annule = true;
      conteneur.replaceChildren();
    };
  }, [ouvert, contenu, formationId, modePleinEcran]);

  if (!ouvert || !contenu) return null;

  const pdf = estPdf(contenu);
  const presentation = estPresentation(contenu);
  if (contenu.type !== "video" && !pdf && !presentation) {
    return null;
  }

  // Log de diagnostic (visible dans la console)
  console.log("[LecteurContenu] Ouverture", {
    id: contenu.id,
    titre: contenu.titre,
    type: contenu.type,
    url: urlContenu(contenu),
  });

  const progression = contenu.type === "video" ? progressionBrute : progressionDocument;
  const pourcentage = Math.round(progression * 100);
  const estComplet = estTermineAuto || progression >= SEUIL_COMPLETION_AUTOMATIQUE;
  const peutMarquerTermine =
    activerSuivi &&
    !estComplet &&
    progression >= SEUIL_VALIDATION_MANUELLE;
  const peutAgrandir = pdf || presentation;

  function gererTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    const temps = video.currentTime;
    setMaxAtteint((precedent) => (temps > precedent ? temps : precedent));
  }

  function gererFin() {
    if (!contenu) return;
    setEstTermineAuto(true);
    if (videoRef.current) {
      setMaxAtteint(videoRef.current.duration || 0);
    }
    if (activerSuivi) {
      const dureeVideo = videoRef.current?.duration || duree;
      surComplet(contenu.id, dureeVideoPourValidation(dureeVideo));
    }
  }

  function marquerTermine() {
    if (!contenu || !peutMarquerTermine) return;
    setEstTermineAuto(true);
    surComplet(
      contenu.id,
      contenu.type === "video"
        ? dureeVideoPourValidation(maxAtteint)
        : tempsLectureDocument,
    );
  }

  function gererChargement() {
    setChargement(false);
    if (videoRef.current) {
      setDuree(videoRef.current.duration || 0);
    }
  }

  function gererErreur() {
    setChargement(false);
    setErreur(
      "Impossible de charger la vidéo. Vérifie ta connexion ou réessaie plus tard.",
    );
  }

  function gererPdfCharge() {
    setChargement(false);
    setDocumentPret(true);
  }

  async function gererTelechargement() {
    if (!contenu || telechargementEnCours) return;
    setTelechargementEnCours(true);
    setErreurTelechargement(null);
    try {
      await telechargerContenu(formationId, contenu.id);
    } catch (err) {
      setErreurTelechargement(
        err instanceof Error
          ? err.message
          : "Le téléchargement a échoué. Réessaie plus tard.",
      );
    } finally {
      setTelechargementEnCours(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/85",
        modePleinEcran ? "p-0" : "p-4 md:p-8",
      )}
      style={{ animation: "dropdown-in 0.15s ease-out" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lecteur-titre"
      data-testid="lecteur-contenu"
    >
      <div
        className={cn(
          "relative flex w-full flex-col overflow-hidden bg-white shadow-2xl",
          modePleinEcran
            ? "h-[100dvh] max-h-none max-w-none rounded-none"
            : "h-full max-h-[90vh] max-w-5xl rounded-xl",
        )}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between gap-4 border-b border-line bg-paper px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#315864] text-white">
              {contenu.type === "video" ? <Play size={16} /> : pdf ? <FileText size={16} /> : <Presentation size={16} />}
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#315864]">
                {contenu.type === "video" ? "Lecture vidéo" : pdf ? "Lecture PDF" : "Lecture présentation"}
              </span>
              <h2
                id="lecteur-titre"
                className="truncate text-sm font-bold text-ink"
              >
                {contenu.titre}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {peutAgrandir && (
              <button
                type="button"
                onClick={() => setModePleinEcran((actif) => !actif)}
                className="grid h-9 w-9 place-items-center rounded-md text-ink/50 transition-colors hover:bg-line/40 hover:text-[#315864]"
                aria-label={modePleinEcran ? "Réduire le lecteur" : "Agrandir le lecteur"}
                title={modePleinEcran ? "Réduire" : "Mode plein écran"}
                aria-pressed={modePleinEcran}
              >
                {modePleinEcran ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
            )}

            <button
              type="button"
              onClick={gererTelechargement}
              disabled={telechargementEnCours}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-ink/70 transition-colors hover:border-[#315864] hover:text-[#315864] disabled:cursor-wait disabled:opacity-60"
            >
              {telechargementEnCours ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span className="hidden sm:inline">
                {telechargementEnCours ? "Préparation…" : "Télécharger"}
              </span>
            </button>

            <button
              type="button"
              onClick={surFermeture}
              className="grid h-9 w-9 place-items-center rounded-md text-ink/50 transition-colors hover:bg-line/40 hover:text-ink"
              aria-label="Fermer le lecteur"
            >
              <X size={18} />
            </button>
          </div>

          {erreurTelechargement && (
            <div className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-xs text-rose-800">
              {erreurTelechargement}
            </div>
          )}
        </div>

        {/* Lecteur intégré : vidéo, PDF natif ou PPTX rendu à l'ouverture */}
        <div className="relative min-h-0 flex-1 bg-black">
          {((contenu.type === "video" && chargement) ||
            (presentation && !documentPret)) &&
            !erreur && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-white/60">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={28} className="animate-spin" />
                <p className="text-xs">
                  {contenu.type === "video"
                    ? "Chargement de la vidéo…"
                    : "Préparation de la présentation…"}
                </p>
              </div>
            </div>
          )}

          {erreur ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
              <p className="text-sm font-bold text-white">Contenu indisponible</p>
              <p className="max-w-md text-xs">{erreur}</p>
              <button
                type="button"
                onClick={gererTelechargement}
                disabled={telechargementEnCours}
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                {telechargementEnCours ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {telechargementEnCours ? "Préparation…" : "Télécharger le contenu"}
              </button>
            </div>
          ) : contenu.type === "video" ? (
            <video
              ref={videoRef}
              src={urlContenu(contenu)}
              controls
              preload="metadata"
              className="h-full max-h-full w-full bg-black object-contain"
              onTimeUpdate={gererTimeUpdate}
              onEnded={gererFin}
              onLoadedMetadata={gererChargement}
              onError={gererErreur}
              onLoadStart={() => console.log("[LecteurContenu] video load start")}
              onCanPlay={() => console.log("[LecteurContenu] video can play")}
              playsInline
            >
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          ) : pdf ? (
            <iframe
              title={`Lecture de ${contenu.titre}`}
              src={urlContenu(contenu)}
              className="h-full w-full border-0 bg-white"
              onLoad={gererPdfCharge}
            />
          ) : (
            <div
              ref={presentationRef}
              className="h-full min-h-0 w-full overflow-auto bg-[#f1f6f5] p-4"
              aria-label={`Lecture de la présentation ${contenu.titre}`}
            />
          )}
        </div>

        {activerSuivi && (
          <div className="border-t border-line bg-paper px-5 py-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-ink/65">
              {estComplet ? (
                <>
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-[#49bfa9] text-white">
                    <Check size={12} />
                  </div>
                  <span className="font-bold text-[#21665a]">
                    {contenu.type === "video" ? "Vidéo" : "Document"} terminé — progression enregistrée automatiquement
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-3 text-ink/55">
              <span className="font-mono text-[10px]">
                {contenu.type === "video"
                  ? `${formaterDureeContenu(maxAtteint)} / ${formaterDureeContenu(duree)}`
                  : `${formaterDureeContenu(tempsLectureDocument)} / ${formaterDureeContenu(dureeDocument)}`}
              </span>
              {!estComplet && (
                <button
                  type="button"
                  onClick={marquerTermine}
                  disabled={!peutMarquerTermine}
                  title={
                    peutMarquerTermine
                      ? "Valider cette ressource"
                      : "Disponible après 90 % de la durée"
                  }
                  className="rounded-md bg-[#315864] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#1f3e47] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Marquer comme terminé
                </button>
              )}
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                estComplet ? "bg-[#49bfa9]" : "bg-[#315864]",
              )}
              style={{ width: `${pourcentage}%` }}
            />
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
