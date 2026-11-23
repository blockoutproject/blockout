import {
  CollectionSourceScopeEnum,
  type SourceCatalogReadResponse,
  type SourceCatalogStatusEnum,
} from "../../../../.generated/schemas/index.zod";

export const sourceCatalogLabels = {
  "not-read": "Non lu",
  complete: "Complet",
  partial: "Partiel",
  unavailable: "Indisponible",
} satisfies Record<SourceCatalogStatusEnum, string>;

export const sourceScopeLabels: Record<CollectionSourceScopeEnum, string> = {
  national: "National",
  regional: "Ligues régionales",
  departmental: "Comités départementaux",
};

export const sourceScopes = CollectionSourceScopeEnum.options.map((value) => ({
  value,
  label: sourceScopeLabels[value],
}));

export type SourceFilters = {
  status?: SourceCatalogStatusEnum;
  scope?: CollectionSourceScopeEnum;
};

/** Older source bindings have no catalogue read until evidence is available. */
export function sourceCatalogStatus(catalog?: SourceCatalogReadResponse) {
  return catalog?.status ?? "not-read";
}
