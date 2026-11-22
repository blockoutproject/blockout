import type { ClassificationDetailResponse } from "../../../../.generated/schemas/index.zod";
import type { ClassificationTarget } from "../api/classification";
import type { ClassificationValues } from "../schemas/classification-schema";

/** Seeds selectors from the setting or effective inheritance without creating an override. */
export function classificationValues(
  current: ClassificationDetailResponse,
  kind: ClassificationTarget["kind"],
): ClassificationValues {
  const setting = current.setting ?? current.effective;
  return {
    custom: kind === "pack" || current.setting !== null,
    divisionId: setting?.divisionId ?? "",
    format: setting?.format ?? "6x6",
    gender: setting?.gender ?? "female",
  };
}
