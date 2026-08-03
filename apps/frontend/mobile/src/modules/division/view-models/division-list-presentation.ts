import type { DivisionResponse } from "@/src/shared/generated/models";

export type DivisionStatusFilter = "Actives" | "Inactives" | "";

export const toDivisionListPresentation = (
  divisions: readonly DivisionResponse[],
  search: string,
  status: DivisionStatusFilter,
): DivisionResponse[] => {
  const normalizedSearch = search.toLowerCase();

  return divisions
    .filter((division) => {
      const matchesSearch = division.name
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesStatus =
        status === "" ||
        (status === "Actives" && division.active) ||
        (status === "Inactives" && !division.active);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => a.id - b.id);
};
