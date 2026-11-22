import {
  CollectionSourceScopeEnum,
  SourceCatalogStatusEnum,
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

export function sourceFiltersFromRoute(params: {
  status?: string | string[];
  scope?: string | string[];
}): SourceFilters {
  return {
    status: SourceCatalogStatusEnum.safeParse(params.status).data,
    scope: CollectionSourceScopeEnum.safeParse(params.scope).data,
  };
}
