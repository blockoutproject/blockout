import type { CloseSeasonValues } from "../schemas/close-season-schema";

/** Every new closure decision starts without an implicit typed confirmation. */
export function closeSeasonValues(): CloseSeasonValues {
  return { confirmation: "" };
}
