import {
  type CollectionSourceScopeEnum,
  type SourceCatalogReadResponse,
  type SourceCatalogStatusEnum,
} from "../../../../.generated/schemas/index.zod";

export const sourceCatalogLabels = {
  "not-read": "Non lu",
  complete: "Complet",
  partial: "Partiel",
  unavailable: "Indisponible",
} satisfies Record<SourceCatalogStatusEnum, string>;

export const sourceScopes = [
  { value: "national", label: "National" },
  { value: "regional", label: "Ligues régionales" },
  { value: "departmental", label: "Comités départementaux" },
] as const satisfies readonly {
  value: CollectionSourceScopeEnum;
  label: string;
}[];

export type SourceFilters = {
  status?: SourceCatalogStatusEnum;
  scope?: CollectionSourceScopeEnum;
};

/** Older source bindings have no catalogue read until evidence is available. */
export function sourceCatalogStatus(catalog?: SourceCatalogReadResponse) {
  return catalog?.status ?? "not-read";
}
