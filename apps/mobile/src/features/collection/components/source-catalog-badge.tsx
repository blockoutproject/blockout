import type { SourceCatalogStatusEnum } from "../../../../.generated/schemas/index.zod";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/shared/components/status-badge";
import { sourceCatalogLabels } from "../model/source-catalogue";

const catalogTones = {
  complete: "success",
  partial: "warning",
  unavailable: "error",
  "not-read": "neutral",
} satisfies Record<SourceCatalogStatusEnum, StatusBadgeTone>;

export function SourceCatalogBadge({
  status,
}: Readonly<{ status: SourceCatalogStatusEnum }>) {
  return (
    <StatusBadge
      label={sourceCatalogLabels[status]}
      tone={catalogTones[status]}
    />
  );
}
