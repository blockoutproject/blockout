import type { Presentation } from "../api/presentation";
import type { PresentationValues } from "../schemas/presentation-schema";

/** Starts an editing snapshot from current manual values; automatic names are not copied into overrides. */
export function presentationValues(
  presentation: Presentation,
): PresentationValues {
  if (presentation.kind === "division-creation")
    return {
      kind: "division",
      name: "",
      shortName: "",
      color: "#245FD8",
      gradient: ["", "", ""],
      logo: { action: "keep" },
    };
  const division =
    presentation.kind === "division" ? presentation.data : undefined;
  const names =
    presentation.kind !== "division" ? presentation.data.names : undefined;
  return {
    kind: presentation.kind,
    name: division?.name ?? names?.manualName ?? "",
    shortName: names?.manualShortName ?? "",
    color: division?.color ?? "",
    gradient: division?.gradient
      ? [division.gradient[0], division.gradient[1], division.gradient[2]]
      : ["", "", ""],
    logo: { action: "keep" },
  };
}
