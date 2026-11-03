import { useRouter } from "expo-router";
import { Text } from "react-native";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { AccountSessionFeedback } from "../../accounts/current-account";
import { useModerationVersion } from "../api/moderation";
import { ContributionHistory } from "./contribution-history";
import { ModerationVersionLoading } from "./moderation-loading";

/** A human-labelled lineage link retains its exact match/member identity even outside loaded pages. */
export interface ModerationVersionSheetProps {
  matchId: string;
  versionId: string;
  relation?: string;
}

/** Presents one read-only member and its reports; F05 recovery precedes private reads without retargeting commands. */
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
        {reading.session.status !== "authenticated" ? (
          <AccountSessionFeedback
            loadingContent={<ModerationVersionLoading />}
          />
        ) : current ? (
          <ContributionHistory
            key={current.id}
            matchId={matchId}
            contribution={current}
            busy={false}
          />
        ) : reading.profile.isLoading ||
          (reading.allowed && reading.query.isLoading) ? (
          <ModerationVersionLoading />
        ) : !reading.canRetain && reading.profile.isSuccess ? (
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            La modération des liens vidéo n’est pas autorisée.
          </Text>
        ) : (
          <ReadFeedback
            loadingContent={<ModerationVersionLoading />}
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
