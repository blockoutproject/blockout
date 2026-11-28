import { useOpenSignInInvitation } from "@/features/accounts/current-account";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useOwnContributionsRead } from "../api/own-contributions";

/** Keeps private read/refresh ownership mounted on the match; only the independent active projection proves public ownership. */
export function useContributionEntry(
  matchId: string,
  available = true,
  publicContributionId?: string,
  publicContributionUrl?: string,
) {
  const router = useRouter();
  const openSignInInvitation = useOpenSignInInvitation();
  const { session, query, canRetain, account } = useOwnContributionsRead(
    matchId,
    available,
  );
  const current = query.data?.pages[0];
  const authorized = available && canRetain && !query.isError;
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
  // Refresh the account itself until it admits the private contributions read.
  const accountOrContributions = canRetain ? query : account;
  const personalRead =
    available && session.status === "authenticated"
      ? accountOrContributions
      : undefined;

  /** Captures only the contributed identity actually displayed; guests receive no replay context. */
  function report() {
    if (session.status === "guest") {
      openSignInInvitation("stream-report");
    } else if (publicContributionId) {
      router.push({
        pathname: "/matches/[matchId]/report-contribution",
        params: {
          matchId,
          contributionId: publicContributionId,
          contributionUrl: publicContributionUrl,
        },
      });
    }
  }

  function manage() {
    router.push({
      pathname: "/matches/[matchId]/contributions",
      params: { matchId },
    });
  }

  function propose() {
    if (session.status === "guest") {
      openSignInInvitation("contribution");
    } else {
      router.push({
        pathname: "/matches/[matchId]/contribution",
        params: { matchId },
      });
    }
  }

  const canReport =
    available &&
    !!publicContributionId &&
    !ownsPublic &&
    !publicOwnershipUnknown &&
    (session.status === "guest" || authorized);
  let primaryAction;
  if (ownsPublic) {
    primaryAction = { label: "Modifier le lien", onPress: manage };
  } else if (!publicContributionUrl && canPropose) {
    primaryAction = { label: "Proposer un lien", onPress: propose };
  }
  return {
    personalRead,
    publicOwnershipUnknown,
    primaryAction,
    manage: hasProposals && !ownsPublic ? manage : undefined,
    report: canReport ? report : undefined,
  };
}

/** Places the compact personal-history or exact-version report action in the stream card. */
export function ContributionActionLink({
  label,
  accessibilityLabel = label,
  onPress,
}: Readonly<{
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
}>) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.manage}
    >
      <Text
        style={[
          tokens.typography.body,
          { color: colors.secondaryText, textDecorationLine: "underline" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  manage: {
    minHeight: tokens.touch.minimum,
    minWidth: tokens.touch.minimum,
    justifyContent: "center",
    alignItems: "center",
  },
});
