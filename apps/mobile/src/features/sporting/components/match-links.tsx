import { Globe, Play } from "lucide-react-native";
import { useNavigation } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { MatchDetailResponse } from "../../../../.generated/schemas/index.zod";
import {
  ContributionActionLink,
  ContributionEntryLoading,
  type useContributionEntry,
} from "@/features/contributions/entry";
import { ReadFeedback } from "@/shared/components/read-feedback";
import { Button, type ButtonProps } from "@/shared/components/button";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useNativeHandoff } from "@/shared/native/use-native-handoff";
import { safeWebsite } from "./contact-link";
import { MatchSurface } from "./match-surface";
import { divisionTextColor } from "../presentation";

/** Public match detail and the actions available to its current viewer. */
interface MatchLinksProps {
  detail: MatchDetailResponse;
  contribution: ReturnType<typeof useContributionEntry>;
}

export function MatchLinks({
  detail,
  contribution,
}: Readonly<MatchLinksProps>) {
  const { colors } = useTheme();
  const url = safeWebsite(detail.streamUrl);
  if (
    !url &&
    !contribution.manage &&
    !contribution.primaryAction &&
    !contribution.publicOwnershipUnknown
  ) {
    return null;
  }
  const division = detail.match.pool.classification.division;
  const context = {
    contextColor: division?.color,
    contextGradient: division?.gradient,
    contextForeground: division ? divisionTextColor(division.color) : undefined,
  };
  let primary;
  if (contribution.publicOwnershipUnknown) {
    // Session restoration can precede the private read. Both retain the exclusive Open/Edit slot.
    primary = contribution.personalRead && (
      <ReadFeedback
        query={contribution.personalRead}
        loadingContent={<ContributionEntryLoading />}
      />
    );
  } else if (contribution.primaryAction) {
    primary = <Button {...context} {...contribution.primaryAction} fullWidth />;
  } else if (url) {
    primary = (
      <OpenStreamButton
        key={`${detail.match.id}:${detail.streamContributionId ?? "professional"}:${url}`}
        url={url}
        label={
          detail.match.category === "completed"
            ? "Regarder la rediffusion"
            : "Regarder le live"
        }
        {...context}
      />
    );
  }
  return (
    <MatchSurface division={division} revealBlock="links">
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            Lien de diffusion
          </Text>
          {contribution.manage && (
            <ContributionActionLink
              label="Gérer"
              accessibilityLabel="Gérer mes propositions"
              onPress={contribution.manage}
            />
          )}
        </View>
        {url ? (
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
            {primary}
          </View>
        ) : (
          <>
            <Text
              style={[tokens.typography.body, { color: colors.secondaryText }]}
            >
              Aucun lien disponible pour ce match.
            </Text>
            {primary}
          </>
        )}
        {contribution.report && (
          <ContributionActionLink
            label="Signaler le lien"
            onPress={contribution.report}
          />
        )}
      </View>
    </MatchSurface>
  );
}

/** Changing the published target unmounts its native handoff and feedback. */
function OpenStreamButton({
  url,
  ...props
}: Readonly<
  Pick<
    ButtonProps,
    "label" | "contextColor" | "contextGradient" | "contextForeground"
  > & {
    url: string;
  }
>) {
  const navigation = useNavigation();
  const handoff = useNativeHandoff(url, () => navigation.isFocused());
  return (
    <Button
      {...props}
      accessibilityRole="link"
      accessibilityHint="Ouvrir le lien de diffusion en dehors de Blockout"
      leadingIcon={Play}
      fullWidth
      loading={handoff.pending}
      onPress={handoff.open}
    />
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
