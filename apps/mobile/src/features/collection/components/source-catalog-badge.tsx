import type { SourceCatalogStatusEnum } from "../../../../.generated/schemas/index.zod";
import { sourceCatalogLabels } from "../model/source-catalogue";
import {
  CollectionStatusBadge,
  type CollectionStatusTone,
} from "./collection-status-badge";

const catalogTones = {
  complete: "success",
  partial: "warning",
  unavailable: "error",
  "not-read": "neutral",
} satisfies Record<SourceCatalogStatusEnum, CollectionStatusTone>;

export function SourceCatalogBadge({
  status,
}: Readonly<{ status: SourceCatalogStatusEnum }>) {
  return (
    <CollectionStatusBadge
      label={sourceCatalogLabels[status]}
      tone={catalogTones[status]}
    />
  );
}
