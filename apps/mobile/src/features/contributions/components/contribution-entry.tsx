import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { Button } from "../../../shared/components/button";
import { useOwnContributionsRead } from "../api/own-contributions";

/** Public match entry offered to guests or currently eligible accounts, independently of Pro. */
export interface ContributionEntryProps {
  entry: ReturnType<typeof useContributionEntry>;
  contextColor?: string;
}

/** Supplies the entry and its current read to the match's existing refresh composition. */
export function useContributionEntry(matchId: string, available = true) {
  const router = useRouter();
  const { session, query, usable, profile } = useOwnContributionsRead(
    matchId,
    available,
  );
  return {
    visible:
      available &&
      (session.status === "guest" ||
        (usable &&
          !query.isError &&
          query.data?.pages[0]?.eligibility.canSubmit === true)),
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
          pathname: "/matches/[matchId]/contribution",
          params: { matchId },
        });
    },
  };
}

/** Presents only an available action using the shared sporting button. */
export function ContributionEntry({
  entry,
  contextColor,
}: ContributionEntryProps) {
  if (!entry.visible) return null;
  return (
    <Button
      label="Stream link"
      accessibilityHint="Proposer une adresse de diffusion pour ce match"
      leadingIcon={Plus}
      variant="inverse"
      size="compact"
      contextColor={contextColor}
      onPress={entry.open}
    />
  );
}
