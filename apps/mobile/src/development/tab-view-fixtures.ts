/** Fictional match rows keep the native trial independent of sporting queries and accounts. */
export interface DemoMatch {
  id: string;
  home: string;
  away: string;
  detail: string;
}

/** A complete fictional day is a native section containing individual virtualized matches. */
export interface DemoDay {
  title: string;
  data: DemoMatch[];
}

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeZone: "UTC",
});

/** Creates only the requested complete days, with stable row identities across consecutive batches. */
export function createDays(
  completed: boolean,
  start: number,
  count: number,
): DemoDay[] {
  return Array.from({ length: count }, (_, offset) => {
    const day = start + offset;
    return {
      title: dayFormatter.format(
        new Date(Date.UTC(2026, 9, completed ? 26 - day : 27 + day)),
      ),
      data: Array.from({ length: 30 }, (_, match) => ({
        id: `${completed ? "completed" : "upcoming"}-${day}-${match}`,
        home: `Équipe démo ${match + 1}`,
        away: `Club visiteur ${day + 1}`,
        detail: completed
          ? "3–1 · Résultat fictif"
          : "19 h 00 · Rencontre fictive",
      })),
    };
  });
}
