import type { ClassificationDetailResponse } from "../../../../.generated/schemas/index.zod";
import type { ClassificationTarget } from "../api/classification";
import type { ClassificationValues } from "../schemas/classification-schema";

/** Seeds selectors from the setting or effective inheritance without creating an override. */
export function classificationValues(
  current: ClassificationDetailResponse,
  kind: ClassificationTarget["kind"],
): ClassificationValues {
  return {
    custom: kind === "pack" || current.setting !== null,
    divisionId: (current.setting ?? current.effective)?.divisionId ?? "",
    format: (current.setting ?? current.effective)?.format ?? "6x6",
    gender: (current.setting ?? current.effective)?.gender ?? "female",
  };
}
