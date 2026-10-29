import { Globe, Play } from "lucide-react-native";
import type { ReactNode } from "react";
import { useNavigation } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
import type { MatchDetailResponse } from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useSportingTransition } from "../../advertising/use-sporting-transition";
import { safeWebsite } from "./contact-link";
import { MatchSurface } from "./match-surface";
import { divisionTextColor } from "../presentation";

/** Current public match projection and optional owner-supplied header action; published addresses retain their exact version. */
export interface MatchLinksProps {
  detail: MatchDetailResponse;
  /** Supply only an available action; it keeps the empty Stream link card reachable without inventing a destination. */
  action?: ReactNode;
}

/** Offers an available HTTP(S) destination or an explicit empty card with the supplied action, without inferring live status or replay. */
export function MatchLinks({ detail, action }: MatchLinksProps) {
  const { colors } = useTheme();
  const url = safeWebsite(detail.streamUrl);
  if (!url && !action) return null;
  const target = `${detail.match.id}:${detail.streamContributionId ?? "professional"}:${url}`;
  return (
    <MatchSurface division={detail.match.pool.classification.division}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            Stream link
          </Text>
          {action}
        </View>
        {url ? (
          <StreamLink key={target} url={url} target={target} detail={detail} />
        ) : (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Aucun lien disponible pour ce match.
          </Text>
        )}
      </View>
    </MatchSurface>
  );
}

/**
 * Projects Media Access 576:8861 with the shared primary action and F03's neutral Stream link name.
 * Changing URL/version retires the previous native handoff and its feedback; header actions keep their own feature ownership.
 */
function StreamLink({
  url,
  target,
  detail,
}: {
  url: string;
  target: string;
  detail: MatchDetailResponse;
}) {
  const transition = useSportingTransition();
  const navigation = useNavigation();
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const division = detail.match.pool.classification.division;

  /** F11 counts the voluntary opening once; only another explicit press retries a failed destination. */
  function open() {
    feedback.clear();
    void transition.open({
      kind: "live",
      target,
      isCurrent: () => navigation.isFocused(),
      open: () => Linking.openURL(url),
      onFailure: () => feedback.error(),
    });
  }

  return (
    <View style={styles.destination}>
      <View style={styles.source}>
        <Globe
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
        <Text style={[styles.hostname, { color: colors.secondaryText }]}>
          {new URL(url).hostname}
        </Text>
      </View>
      <Button
        label="Ouvrir le lien"
        accessibilityRole="link"
        accessibilityHint="Ouvrir le Stream link de ce match"
        leadingIcon={Play}
        fullWidth
        contextColor={division?.color}
        contextGradient={division?.gradient}
        contextForeground={
          division ? divisionTextColor(division.color) : undefined
        }
        loading={transition.pending}
        onPress={open}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  title: { ...tokens.typography.heading, flex: 1, minWidth: 0 },
  destination: { gap: tokens.spacing.md },
  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  hostname: { ...tokens.typography.body, flex: 1 },
});
