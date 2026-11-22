export const seasonCommands = {
  activation: { verb: "Activer", label: "Activer la saison" },
  closure: { verb: "Clôturer", label: "Clôturer la saison" },
} as const;

export type SeasonCommand = keyof typeof seasonCommands;
