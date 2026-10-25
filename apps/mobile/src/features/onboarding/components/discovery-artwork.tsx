import { Image } from "expo-image";
import { ChevronRight, Flag } from "lucide-react-native";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Original Figma illustration; optional artwork motion stays inside the fixed source crop. */
export function DiscoveryBackdrop({
  artworkStyle,
}: {
  artworkStyle?: ComponentProps<typeof Animated.View>["style"];
}) {
  const { scheme } = useTheme();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.backdrop}
    >
      <Animated.View style={[styles.backdropAsset, artworkStyle]}>
        <Image
          accessible={false}
          source={
            scheme === "dark"
              ? require("../../../../assets/onboarding/community-backdrop-dark.svg")
              : require("../../../../assets/onboarding/community-backdrop-light.svg")
          }
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** Noninteractive approved examples accompany notification and reporting discovery steps. */
export function DiscoveryExample({ step }: { step: number }) {
  const { colors, scheme } = useTheme();
  // Approved Ligue B illustration aliases (Figma 4913:2810 / 4913:2833), not a sporting palette owner.
  const division =
    scheme === "dark"
      ? { border: "#F2A9006B", subtle: "#F2A90014", accent: "#F2A900" }
      : { border: "#F2A9004D", subtle: "#F2A9000F", accent: "#91680A" };
  if (step !== 1 && step !== 2) return null;
  const notification = step === 1;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.example,
        !notification && styles.report,
        {
          backgroundColor: colors.surface,
          borderColor: notification ? division.border : colors.border,
        },
      ]}
    >
      <View style={[styles.row, !notification && styles.reportHeader]}>
        {notification ? (
          <>
            <Image
              source={require("../../../../assets/onboarding/ligue-b.png")}
              style={styles.logo}
            />
            <Text
              style={[
                styles.secondary,
                { color: colors.secondaryText, flex: 1 },
              ]}
            >
              Ligue B Masculine
            </Text>
            <ChevronRight size={16} color={colors.secondaryText} />
          </>
        ) : (
          <>
            <Text
              style={[styles.exampleTitle, { color: colors.text, flex: 1 }]}
            >
              Le match
            </Text>
            <View style={[styles.flag, { borderColor: colors.error }]}>
              <Flag size={24} color={colors.icon} />
            </View>
          </>
        )}
      </View>
      <View
        style={!notification && [styles.match, { borderColor: colors.border }]}
      >
        {(notification
          ? [
              ["", "Saint-Quentin Volley", "3"],
              ["", "REC Volley", "2"],
            ]
          : [
              ["SV", "Saintes Volley-Ball", "3"],
              ["VBP", "Volley-Ball Pexinois Niort", "2"],
            ]
        ).map(([mark, team, score], index) => (
          <View
            key={team}
            style={[
              styles.row,
              !notification && styles.matchRow,
              !notification &&
                index === 1 && {
                  borderTopWidth: tokens.borderWidth,
                  borderColor: colors.border,
                },
            ]}
          >
            {!!mark && (
              <Text style={[styles.mark, { color: colors.text }]}>{mark}</Text>
            )}
            <Text
              style={[
                tokens.typography.strong,
                { color: colors.text, flex: 1 },
              ]}
            >
              {team}
            </Text>
            <View
              style={[
                styles.score,
                !notification && styles.matchScore,
                {
                  backgroundColor: notification
                    ? index === 0
                      ? division.subtle
                      : "transparent"
                    : colors.subtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.exampleTitle,
                  {
                    color: notification
                      ? index === 0
                        ? division.accent
                        : colors.secondaryText
                      : colors.text,
                  },
                ]}
              >
                {score}
              </Text>
            </View>
          </View>
        ))}
      </View>
      {notification && (
        <View
          style={[
            styles.row,
            styles.resultFooter,
            { borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.secondary, { color: colors.secondaryText, flex: 1 }]}
          >
            Score final
          </Text>
          <Text style={[styles.secondary, { color: colors.secondaryText }]}>
            À l’instant
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  // Product Design 6650:4927 / 6650:5123, absolute-bounds SVGs. Artwork opacity and rotation remain in the exports.
  backdropAsset: {
    position: "absolute",
    width: 1077,
    height: 322,
    left: -331.3563,
    top: "50%",
    marginTop: -183.7386,
  },
  example: {
    padding: tokens.spacing.md,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    gap: tokens.spacing.sm,
  },
  report: { padding: tokens.spacing.sm },
  reportHeader: { padding: tokens.spacing.xs },
  match: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.control,
  },
  matchRow: { minHeight: 56, padding: tokens.spacing.sm },
  matchScore: { minHeight: 40, minWidth: 40 },
  row: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  logo: { width: 32, height: 32, borderRadius: tokens.radius.full },
  secondary: { ...tokens.typography.metadata },
  exampleTitle: { ...tokens.typography.navigation },
  flag: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderRadius: tokens.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  score: {
    minWidth: 32,
    minHeight: 32,
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.badge,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: { ...tokens.typography.metadata, width: 32, textAlign: "center" },
  resultFooter: {
    borderTopWidth: tokens.borderWidth,
    paddingTop: tokens.spacing.sm,
  },
});
