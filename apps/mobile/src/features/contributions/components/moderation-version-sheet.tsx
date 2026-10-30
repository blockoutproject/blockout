import { useRouter } from "expo-router";
import { Text } from "react-native";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useModerationVersion } from "../api/moderation";
import { ContributionHistory } from "./contribution-history";

/** A human-labelled lineage link retains its exact match/member identity even outside loaded pages. */
export interface ModerationVersionSheetProps {
  matchId: string;
  versionId: string;
  relation?: string;
}

/** The existing sheet presents one read-only version and its own reports, without retargeting commands or showing technical IDs. */
export function ModerationVersionSheet({
  matchId,
  versionId,
  relation,
}: ModerationVersionSheetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const reading = useModerationVersion(matchId, versionId);
  const current =
    reading.canRetain && !isAccessDenied(reading.query.error)
      ? reading.query.data?.contribution
      : undefined;
  return (
    <Sheet
      title={
        relation === "source"
          ? "Version d’origine"
          : relation === "replacement"
            ? "Version de remplacement"
            : "Version du lien"
      }
      onClose={() => router.back()}
    >
      <SheetContent>
        {current ? (
          <ContributionHistory
            key={current.id}
            matchId={matchId}
            contribution={current}
            busy={false}
          />
        ) : !reading.canRetain && reading.profile.isSuccess ? (
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            La modération des liens vidéo n’est pas autorisée.
          </Text>
        ) : (
          <ReadFeedback
            query={
              reading.profile.isError || reading.profile.isPending
                ? reading.profile
                : reading.query
            }
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
