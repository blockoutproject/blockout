import { useRouter } from "expo-router";
import { Power, PowerOff } from "lucide-react-native";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { EntryGroup } from "@/shared/components/entry-group";
import { EntryRow } from "@/shared/components/entry-row";
import { ListLoading } from "@/shared/components/list-loading";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { EmptyState } from "@/shared/components/state-card";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useCollectionSeason } from "../api/use-collection-season";
import {
  seasonActionsLabel,
  seasonCommands,
  seasonCommandsByState,
  type SeasonCommand,
} from "../model/season-command";

/** Replaces the sheet with the selected confirmation so Back returns to the season. */
export function SeasonActionsSheet({
  seasonId,
}: Readonly<{ seasonId: string }>) {
  const router = useRouter();
  const { colors } = useTheme();
  const { authority, season } = useCollectionSeason(seasonId);
  const loading = <ListLoading label="Chargement des actions" />;

  function openConfirmation(command: SeasonCommand) {
    router.replace({
      pathname:
        command === "activation"
          ? "/collection/[seasonId]/activation"
          : "/collection/[seasonId]/closure",
      params: { seasonId },
    });
  }

  function renderActions() {
    if (!authority.enabled) {
      return <AccessFeedback {...authority} loadingContent={loading} />;
    }
    if (!season.data || hasReadError(season)) {
      return <ReadFeedback query={season} loadingContent={loading} />;
    }
    const commands = seasonCommandsByState[season.data.state];
    if (!commands.length) {
      return <EmptyState title="Aucune action disponible" />;
    }
    return (
      <EntryGroup>
        {commands.map((command) => {
          const activating = command === "activation";
          const Icon = activating ? Power : PowerOff;
          return (
            <EntryRow
              key={command}
              label={seasonCommands[command].label}
              icon={
                <Icon
                  color={activating ? colors.icon : colors.error}
                  size={tokens.size.icon.lg}
                />
              }
              disclosure
              onPress={() => openConfirmation(command)}
            />
          );
        })}
      </EntryGroup>
    );
  }

  return (
    <Sheet title={seasonActionsLabel} onClose={() => router.back()}>
      <SheetContent>{renderActions()}</SheetContent>
    </Sheet>
  );
}
