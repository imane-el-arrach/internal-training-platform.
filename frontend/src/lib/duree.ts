/** Affichage destiné aux formations et contenus : minutes, puis heures + minutes. */
export function formaterDureeFormation(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "Durée non renseignée";

  const minutesArrondies = Math.ceil(minutes);
  const heures = Math.floor(minutesArrondies / 60);
  const minutesRestantes = minutesArrondies % 60;

  if (heures === 0) return `${minutesArrondies} min`;
  if (minutesRestantes === 0) return `${heures} h`;

  return `${heures} h ${minutesRestantes} min`;
}

/** Les questionnaires sont affichés avec minutes et secondes, pour un minuteur précis. */
export function formaterDureeQuestionnaire(secondes: number | null | undefined): string {
  if (!secondes || secondes <= 0) return "Sans limite";

  return formaterMinutesSecondes(secondes);
}

/** Durée de contenu stockée en secondes et affichée sans perdre cette précision. */
export function formaterDureeContenu(secondes: number | null | undefined): string {
  if (!secondes || secondes <= 0) return "Durée non renseignée";

  return formaterMinutesSecondes(secondes);
}

function formaterMinutesSecondes(secondes: number): string {
  const total = Math.max(0, Math.round(secondes));
  const minutes = Math.floor(total / 60);
  const secondesRestantes = total % 60;
  return `${minutes} min ${String(secondesRestantes).padStart(2, "0")} s`;
}
