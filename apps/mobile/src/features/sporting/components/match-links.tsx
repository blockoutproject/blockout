import { Globe, Play } from "lucide-react-native";
import type { ReactNode } from "react";
import { useNavigation } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { MatchDetailResponse } from "../../../../.generated/schemas/index.zod";
import { Button } from "@/shared/components/button";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useNativeHandoff } from "@/shared/native/use-native-handoff";
import { safeWebsite } from "./contact-link";
import { MatchSurface } from "./match-surface";
import { divisionTextColor } from "../presentation";

/** Current public match projection and optional owner-supplied header action; published addresses retain their exact version. */
export interface MatchLinksProps {
  detail: MatchDetailResponse;
  /** Supply only an available action; it keeps the empty stream link card reachable without inventing a destination. */
  action?: ReactNode;
  /** F08 supplies the sole primary action when adding a link or managing the exact public owner version. */
  primaryAction?: ReactNode;
  /** F08 supplies a separate exact-version report action for a non-owned contributed URL. */
  reportAction?: ReactNode;
}

/** Offers a published destination or an empty card with the supplied contribution action. */
export function MatchLinks({
  detail,
  action,
  primaryAction,
  reportAction,
}: Readonly<MatchLinksProps>) {
  const { colors } = useTheme();
  const url = safeWebsite(detail.streamUrl);
  if (!url && !action && !primaryAction) {
    return null;
  }
  const target = `${detail.match.id}:${detail.streamContributionId ?? "professional"}:${url}`;
  return (
    <MatchSurface
      division={detail.match.pool.classification.division}
      revealBlock="links"
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            Lien de diffusion
          </Text>
          {action}
        </View>
        {url ? (
          <StreamLink
            key={target}
            url={url}
            detail={detail}
            action={primaryAction}
          />
        ) : (
          <>
            <Text
              style={[tokens.typography.body, { color: colors.secondaryText }]}
            >
              Aucun lien disponible pour ce match.
            </Text>
            {primaryAction}
          </>
        )}
        {reportAction}
      </View>
    </MatchSurface>
  );
}

/**
 * Projects Media Access 576:8861 with the shared primary action and F03's neutral heading.
 * Changing URL/version retires the previous native handoff and its feedback; header actions keep their own feature ownership.
 */
function StreamLink({
  url,
  detail,
  action,
}: Readonly<{
  url: string;
  detail: MatchDetailResponse;
  action?: ReactNode;
}>) {
  const navigation = useNavigation();
  const handoff = useNativeHandoff(url, () => navigation.isFocused());
  const { colors } = useTheme();
  const division = detail.match.pool.classification.division;

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
      {action ?? (
        <Button
          label={
            detail.match.category === "completed"
              ? "Regarder la rediffusion"
              : "Regarder le live"
          }
          accessibilityRole="link"
          accessibilityHint="Ouvrir le lien de diffusion en dehors de Blockout"
          leadingIcon={Play}
          fullWidth
          contextColor={division?.color}
          contextGradient={division?.gradient}
          contextForeground={
            division ? divisionTextColor(division.color) : undefined
          }
          loading={handoff.pending}
          onPress={handoff.open}
        />
      )}
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
