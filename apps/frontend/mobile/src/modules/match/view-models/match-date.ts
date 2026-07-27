import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

function parseLocalDateUTC(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Format a backend LocalDate for the match-list date header. */
export function formatMatchDateHeader(dateString: string): string {
  const targetDate = parseLocalDateUTC(dateString);
  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const differenceInDays =
    (targetDate.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24);

  if (differenceInDays === 0) return "Aujourd’hui";
  if (differenceInDays === -1) return "Hier";
  if (differenceInDays === 1) return "Demain";

  const formatted = targetDate.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Split an ISO match timestamp into its localized date and time labels. */
export function formatMatchDateTime(isoString: string) {
  const date = parseISO(isoString);

  return {
    date: format(date, "d MMM yyyy", { locale: fr }),
    time: format(date, "HH:mm", { locale: fr }),
  };
}
