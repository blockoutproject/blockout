import { NavigationLink } from "../../shared/components/navigation-link";
import { useRouter } from "expo-router";
import { SquarePen } from "lucide-react-native";
import { IconButton } from "../../shared/components/icon-button";
import { tokens } from "../../shared/theme/tokens";
import { useTheme } from "../../shared/theme/theme-provider";
import { useAdministrationCapabilities } from "../access/api/use-administration-capabilities";
import type { ClassificationTarget } from "./api/classification";
import type { PresentationTarget } from "./api/presentation";

/** Resource actions can compose this entry without importing the editor or duplicating F12's permission rules. */
export interface PresentationEntryProps {
  target: Exclude<PresentationTarget, { kind: "division-creation" }>;
}

/** Discreet contextual editor; route admission and server authorization remain independently enforced. */
export function PresentationEntry({ target }: PresentationEntryProps) {
  /** Names the sporting resource addressed by this contextual editor entry. */
  function presentationEntryLabel() {
    if (target.kind === "team") {
      return "Modifier l’équipe";
    }
    if (target.kind === "club") {
      return "Modifier le club";
    }
    if (target.kind === "pool") {
      return "Modifier la poule";
    }
    return "Modifier la division";
  }

  const { permissions } = useAdministrationCapabilities();
  const router = useRouter();
  const { colors } = useTheme();
  if (permissions?.manageSportingPresentation !== true) {
    return null;
  }
  return (
    <IconButton
      onPress={() =>
        router.push({
          pathname: "/administration/presentation/[kind]/[id]",
          params: { kind: target.kind, id: target.id },
        })
      }
      label={presentationEntryLabel()}
    >
      <SquarePen
        accessible={false}
        size={tokens.size.icon.lg}
        color={colors.icon}
      />
    </IconButton>
  );
}

/** Contextual pack/pool entry exposes no collection or presentation power. */
export function ClassificationEntry({
  target,
}: {
  target: ClassificationTarget;
}) {
  const { permissions } = useAdministrationCapabilities();
  if (permissions?.manageSportingClassification !== true) {
    return null;
  }
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
