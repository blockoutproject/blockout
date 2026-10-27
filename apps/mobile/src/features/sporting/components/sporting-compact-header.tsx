import { StyleSheet, Text } from "react-native";
import { useCollapseProgress } from "react-native-collapsible-tab";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type {
  SportingDivisionResponse,
  SportingIdentityResponse,
} from "../../../../.generated/schemas/index.zod";
import { PageHeader } from "../../../shared/components/page-header";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useReducedMotion } from "../../../shared/theme/use-reduced-motion";
import { SportingLogo } from "./sporting-identity";

/** A compact copy uses the same canonical logo; the large identity remains the sole action/reading region. */
export interface SportingCompactHeaderProps {
  title: string;
  identity: SportingIdentityResponse;
  kind: "team" | "pool" | "club";
  division?: SportingDivisionResponse;
}

/** Fades the accepted 28px identity into the pinned navigation as RNCT collapses the real profile. */
export function SportingCompactHeader({
  title,
  identity,
  kind,
  division,
}: SportingCompactHeaderProps) {
  const progress = useCollapseProgress();
  const reducedMotion = useReducedMotion();
  const { colors } = useTheme();
  const fade = useAnimatedStyle(() => ({
    opacity: reducedMotion ? (progress.value >= 1 ? 1 : 0) : progress.value,
  }));
  return (
    <PageHeader title={title}>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.identity, fade]}
      >
        <SportingLogo
          identity={
            kind === "pool"
              ? (division ?? { ...identity, logoUrl: undefined })
              : identity
          }
          kind={kind === "pool" ? "division" : kind}
          size={28}
        />
        <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
          {identity.name}
        </Text>
      </Animated.View>
    </PageHeader>
  );
}

const styles = StyleSheet.create({
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
  },
  name: { ...tokens.typography.navigation, flexShrink: 1 },
});
