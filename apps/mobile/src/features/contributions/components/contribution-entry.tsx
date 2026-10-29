import { useRouter } from "expo-router";
import { Ellipsis } from "lucide-react-native";
import { IconButton } from "../../../shared/components/icon-button";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useOwnContributionsRead } from "../api/own-contributions";

/** Stream card header entry opens personal proposals independently of eligibility for a new submission. */
export interface ContributionEntryProps {
  entry: ReturnType<typeof useContributionEntry>;
}

/** Supplies the entry and its current read to the match's existing refresh composition. */
export function useContributionEntry(matchId: string, available = true) {
  const router = useRouter();
  const { session, query, usable, profile } = useOwnContributionsRead(
    matchId,
    available,
  );
  const hasProposals = usable && (query.data?.pages[0]?.proposalCount ?? 0) > 0;
  return {
    visible:
      available &&
      (session.status === "guest" ||
        (usable &&
          !query.isError &&
          (hasProposals ||
            query.data?.pages[0]?.eligibility.canSubmit === true))),
    refreshing: query.isRefetching || profile.isRefetching,
    /** Reobserves the existing owner on match refresh; a recovered profile enables its dependent query. */
    refresh() {
      if (!available || session.status !== "authenticated")
        return Promise.resolve(undefined);
      return usable
        ? query.refetch({ cancelRefetch: false })
        : profile.refetch({ cancelRefetch: false });
    },
    /** Carries only the match or invitation reason, never an address or deferred command. */
    open() {
      if (session.status === "guest")
        router.push({
          pathname: "/sign-in-invitation",
          params: { reason: "contribution" },
        });
      else
        router.push({
          pathname: "/matches/[matchId]/contributions",
          params: { matchId },
        });
    },
  };
}

/** The named native icon opens one owner screen directly, including its empty state; it starts no deferred command. */
export function ContributionEntry({ entry }: ContributionEntryProps) {
  const { colors } = useTheme();
  if (!entry.visible) return null;
  return (
    <IconButton label="Gérer mes propositions" onPress={entry.open}>
      <Ellipsis
        accessible={false}
        size={tokens.size.icon.lg}
        color={colors.icon}
      />
    </IconButton>
  );
}
