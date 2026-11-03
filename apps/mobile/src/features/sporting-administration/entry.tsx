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
  const { permissions } = useAdministrationCapabilities();
  const router = useRouter();
  const { colors } = useTheme();
  if (permissions?.manageSportingPresentation !== true) return null;
  return (
    <IconButton
      onPress={() =>
        router.push({
          pathname: "/administration/presentation/[kind]/[id]",
          params: { kind: target.kind, id: target.id },
        })
      }
      label={
        target.kind === "team"
          ? "Modifier l’équipe"
          : target.kind === "club"
            ? "Modifier le club"
            : target.kind === "pool"
              ? "Modifier la poule"
              : "Modifier la division"
      }
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
