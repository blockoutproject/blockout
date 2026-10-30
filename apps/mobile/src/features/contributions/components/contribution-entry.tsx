import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { Button, type ButtonProps } from "../../../shared/components/button";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useOwnContributionsRead } from "../api/own-contributions";

/** F08 supplies either the card's primary destination or its compact personal-proposals header entry. */
export interface ContributionEntryProps {
  entry: ReturnType<typeof useContributionEntry>;
  header?: boolean;
  contextColor?: ButtonProps["contextColor"];
  contextGradient?: ButtonProps["contextGradient"];
  contextForeground?: ButtonProps["contextForeground"];
}

/** Keeps private read/refresh ownership mounted on the match; only the independent active projection proves public ownership. */
export function useContributionEntry(
  matchId: string,
  available = true,
  publicContributionId?: string,
  publicContributionUrl?: string,
) {
  const router = useRouter();
  const { session, query, usable, profile } = useOwnContributionsRead(
    matchId,
    available,
  );
  const current = query.data?.pages[0];
  const authorized = available && usable && !query.isError;
  const hasProposals = authorized && (current?.proposalCount ?? 0) > 0;
  const ownsPublic =
    authorized &&
    !!publicContributionId &&
    current?.activeContribution?.id === publicContributionId;
  // Only an established or in-progress session can resolve private ownership; failed F05 sessions retain public consultation.
  const publicOwnershipUnknown =
    available &&
    !!publicContributionId &&
    (session.status === "authenticated" ||
      session.status === "restoring" ||
      session.status === "authenticating") &&
    (!authorized || !current);
  const canPropose =
    available &&
    (session.status === "guest" ||
      (authorized && current?.eligibility.canSubmit === true));
  return {
    hasProposals,
    ownsPublic,
    publicOwnershipUnknown,
    ownershipRead:
      session.status === "authenticated"
        ? usable
          ? query
          : profile
        : undefined,
    canPropose,
    canReport:
      available &&
      !!publicContributionId &&
      !ownsPublic &&
      !publicOwnershipUnknown &&
      (session.status === "guest" || authorized),
    /** Captures only the contributed identity actually displayed; guests receive no replay context. */
    report() {
      if (session.status === "guest")
        router.push({
          pathname: "/sign-in-invitation",
          params: { reason: "stream-report" },
        });
      else if (publicContributionId)
        router.push({
          pathname: "/matches/[matchId]/report-contribution",
          params: {
            matchId,
            contributionId: publicContributionId,
            contributionUrl: publicContributionUrl,
          },
        });
    },
    refreshing: query.isRefetching || profile.isRefetching,
    /** Reobserves the existing owner on match refresh; a recovered profile enables its dependent query. */
    refresh() {
      if (!available || session.status !== "authenticated")
        return Promise.resolve(undefined);
      return usable
        ? query.refetch({ cancelRefetch: false })
        : profile.refetch({ cancelRefetch: false });
    },
    /** Opens the existing owner screen without replaying a mutation or carrying an address. */
    open() {
      router.push({
        pathname: "/matches/[matchId]/contributions",
        params: { matchId },
      });
    },
    /** An eligible first proposal opens its form directly; guests retain the existing F05 invitation. */
    propose() {
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

/** Keeps contributed-link ownership unresolved through native read feedback before exposing the appropriate action. */
export function ContributionEntry({
  entry,
  header = false,
  ...context
}: ContributionEntryProps) {
  const { colors } = useTheme();
  if (header)
    return entry.hasProposals ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Gérer mes propositions"
        onPress={entry.open}
        style={styles.manage}
      >
        <Text
          style={[
            tokens.typography.body,
            { color: colors.secondaryText, textDecorationLine: "underline" },
          ]}
        >
          Gérer
        </Text>
      </Pressable>
    ) : null;
  if (entry.publicOwnershipUnknown)
    return entry.ownershipRead ? (
      <ReadFeedback query={entry.ownershipRead} />
    ) : null;
  if (!entry.ownsPublic && !entry.canPropose) return null;
  return (
    <Button
      {...context}
      label={entry.ownsPublic ? "Modifier le lien" : "Proposer un lien"}
      fullWidth
      onPress={entry.ownsPublic ? entry.open : entry.propose}
    />
  );
}
/** Contextual exact-version report action, distinct from the match's general support destination. */
export function ContributionReportEntry({ entry }: ContributionEntryProps) {
  const { colors } = useTheme();
  return entry.canReport ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Signaler le lien"
      onPress={entry.report}
      style={styles.manage}
    >
      <Text
        style={[
          tokens.typography.body,
          { color: colors.secondaryText, textDecorationLine: "underline" },
        ]}
      >
        Signaler le lien
      </Text>
    </Pressable>
  ) : null;
}
const styles = StyleSheet.create({
  manage: {
    minHeight: tokens.touch.minimum,
    minWidth: tokens.touch.minimum,
    justifyContent: "center",
    alignItems: "center",
  },
});
