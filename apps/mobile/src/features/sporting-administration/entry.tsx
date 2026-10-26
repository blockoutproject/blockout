import { NavigationLink } from "../../shared/components/navigation-link";
import { useAdministrationCapabilities } from "../access/api/use-administration-capabilities";
import type { ClassificationTarget } from "./api/classification";
import type { PresentationTarget } from "./api/presentation";

/** Resource actions can compose this entry without importing the editor or duplicating F12's permission rules. */
export interface PresentationEntryProps {
  target: Exclude<PresentationTarget, { kind: "division-creation" }>;
}
/** Current action-specific link; route admission and server authorization remain independently enforced. */
export function PresentationEntry({ target }: PresentationEntryProps) {
  const { permissions } = useAdministrationCapabilities();
  if (permissions?.manageSportingPresentation !== true) return null;
  return (
    <NavigationLink
      href={{
        pathname: "/administration/presentation/[kind]/[id]",
        params: { kind: target.kind, id: target.id },
      }}
      label="Modifier la présentation"
    />
  );
}

/** Contextual pack/pool entry exposes no collection or presentation power. */
export function ClassificationEntry({
  target,
}: {
  target: ClassificationTarget;
}) {
  const { permissions } = useAdministrationCapabilities();
  if (permissions?.manageSportingClassification !== true) return null;
  return (
    <NavigationLink
      href={{
        pathname: "/administration/classification/[kind]/[id]",
        params: { kind: target.kind, id: target.id },
      }}
      label="Modifier la classification"
    />
  );
}
