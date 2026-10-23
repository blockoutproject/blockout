import type { NotificationResponse } from "../../../../.generated/schemas/index.zod";

/** Fresh generated transport fixture; callers keep family, identity and timing scenarios explicit. */
export function notificationResponse(): NotificationResponse {
  const id = "00000000-0000-4000-8000-000000000237";
  return {
    id,
    createdAt: "2026-10-24T01:02:03.123456Z",
    family: "result",
    read: false,
    title: "Le résultat est disponible 🏐",
    match: {
      id,
      pool: {
        pool: { id, name: "Poule A" },
        season: { id, label: "2026–2027", startYear: 2026 },
        classification: {},
      },
      home: { id, name: "Équipe A" },
      away: { id: "00000000-0000-4000-8000-000000000238", name: "Équipe B" },
      schedule: {
        localDate: "2026-10-24",
        timeZone: "Europe/Paris",
        observedAt: "2026-10-24T01:00:00Z",
      },
      category: "completed",
      result: {
        state: "final",
        specialLabel: "Forfait",
        observedAt: "2026-10-24T01:00:00Z",
      },
    },
    division: { id, name: "Division", color: "#112233", gradient: null },
  };
}
