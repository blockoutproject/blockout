import type { Presentation } from "../api/presentation";
import type { PresentationValues } from "../schemas/presentation-schema";
import { clubContactValues } from "./club-contact-values";

/** An editorial division starts with local field values. */
export const newDivisionValues: PresentationValues = {
  kind: "division",
  name: "",
  shortName: "",
  color: "#245FD8",
  gradient: ["", "", ""],
  logo: { action: "keep" },
};

/** Prefills the editor from accepted effective values. */
export function presentationValues(
  presentation: Presentation,
): PresentationValues {
  const division =
    presentation.kind === "division" ? presentation.data : undefined;
  const names =
    presentation.kind !== "division" ? presentation.data.names : undefined;
  return {
    kind: presentation.kind,
    name: division?.name ?? names?.effectiveName ?? "",
    shortName: names?.effectiveShortName ?? "",
    color: division?.color ?? "",
    gradient: division?.gradient
      ? [division.gradient[0], division.gradient[1], division.gradient[2]]
      : ["", "", ""],
    logo: { action: "keep" },
    ...(presentation.kind === "club" ? { contacts: clubContactValues() } : {}),
  };
}
