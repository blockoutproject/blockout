import { homeHref } from "@/shared/native/home-href";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  clamp,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { IconButton } from "./icon-button";

/** Ordinary page chrome; tab roots omit Back, while details use history or their owning departure. */
export interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  /** Decorative artwork and the title stack align together between the navigation rails. */
  titleArtwork?: ReactNode;
  /** A composed compact identity may replace the title stack between the navigation rails. */
  children?: ReactNode;
  /** Trailing controls remain available independently of the detail read. */
  action?: ReactNode;
  back?: boolean;
  /** Center reserves one control on each side of the Match recap or fallback title. */
  titleAlignment?: "start" | "center";
  /** A nested destination can leave through its own stack instead of the global tab history. */
  onBack?: () => void;
  /** Native scroll distance reveals only the identity; null keeps it hidden until a scroller is available. */
  revealOffset?: SharedValue<number> | null;
}

export function PageHeader({
  title,
  subtitle,
  titleArtwork,
  children,
  action,
  back = true,
  titleAlignment = "start",
  onBack,
  revealOffset,
}: Readonly<PageHeaderProps>) {
  const router = useRouter();
  const { colors, reducedMotion } = useTheme();
  const centered = titleAlignment === "center";
  const collapsible = revealOffset !== undefined;
  const heading = subtitle && title ? `${title}, ${subtitle}` : title;
  const visibility = useDerivedValue(() => {
    if (!collapsible) {
      return 1;
    }
    const progress = clamp(
      (revealOffset?.get() ?? 0) /
        tokens.motion.navigation.headerRevealDistance,
      0,
      1,
    );
    return reducedMotion ? Number(progress >= 1) : Easing.quad(progress);
  });
  const reveal = useAnimatedStyle(() => ({ opacity: visibility.get() }));
  const accessibility = useAnimatedProps(() => {
    const hidden = visibility.get() <= 0;
    return {
      accessible: !hidden && Boolean(heading),
      accessibilityElementsHidden: hidden,
      importantForAccessibility: hidden
        ? ("no-hide-descendants" as const)
        : ("auto" as const),
    };
  });
  const backButton = back ? (
    <IconButton
      label="Retour"
      onPress={
        onBack ??
        (() => (router.canGoBack() ? router.back() : router.replace(homeHref)))
      }
    >
      <ChevronLeft
        accessible={false}
        color={colors.icon}
        size={tokens.size.icon.lg}
      />
    </IconButton>
  ) : null;
  return (
    <View style={[styles.header, !centered && styles.startHeader]}>
      {centered ? (
        <View style={styles.centeredRail}>{backButton}</View>
      ) : (
        backButton
      )}
      <Animated.View
        accessible={Boolean(heading)}
        accessibilityRole={heading ? "header" : undefined}
        accessibilityLabel={heading}
        animatedProps={accessibility}
        style={[styles.identity, centered && styles.centeredIdentity, reveal]}
      >
        {children ||
          (title ? (
            <>
              {titleArtwork && (
                <View pointerEvents="none" aria-hidden>
                  {titleArtwork}
                </View>
              )}
              <View aria-hidden={collapsible} style={styles.copy}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.title,
                    centered && styles.centeredText,
                    { color: colors.text },
                  ]}
                >
                  {title}
                </Text>
                {!!subtitle && (
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      styles.subtitle,
                      centered && styles.centeredText,
                      { color: colors.secondaryText },
                    ]}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
            </>
          ) : null)}
      </Animated.View>
      {(action || centered) && (
        <View style={[styles.actions, centered && styles.centeredRail]}>
          {action}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.layout.header,
    paddingHorizontal: tokens.spacing.lg,
  },
  startHeader: { gap: tokens.spacing.sm },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  centeredRail: { width: tokens.size.control.default },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  centeredIdentity: { justifyContent: "center" },
  copy: { flexShrink: 1, minWidth: 0, gap: tokens.spacing.optical },
  title: tokens.typography.navigation,
  subtitle: tokens.typography.metadata,
  centeredText: { textAlign: "center" },
});
