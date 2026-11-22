import type { CollectionSeasonStateEnum } from "../../../../.generated/schemas/index.zod";

export const seasonActionsLabel = "Actions de la saison";

export const seasonCommands = {
  activation: { verb: "Activer", label: "Activer la saison" },
  closure: { verb: "Clôturer", label: "Clôturer la saison" },
} as const;

export type SeasonCommand = keyof typeof seasonCommands;

export const seasonCommandsByState = {
  preparing: ["activation", "closure"],
  active: ["closure"],
  closed: [],
} as const satisfies Record<
  CollectionSeasonStateEnum,
  readonly SeasonCommand[]
>;
