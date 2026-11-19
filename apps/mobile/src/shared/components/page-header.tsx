import { homeHref } from "@/shared/native/home-href";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
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
import { useReducedMotion } from "@/shared/theme/use-reduced-motion";

/** Ordinary page chrome; tab roots omit Back, while details use history or their owning departure. */
export interface PageHeaderProps {
  title?: string;
  /** A composed compact identity may replace the plain title between the navigation rails. */
  children?: ReactNode;
  /** Trailing controls remain available independently of the detail read. Centered headers reserve one control. */
  action?: ReactNode;
  back?: boolean;
  /** Single-entity details can start beside Back; plain titles without Back start at the page inset. */
  titleAlignment?: "start" | "center";
  /** A nested destination can leave through its own stack instead of the global tab history. */
  onBack?: () => void;
  /** Native scroll distance reveals only the identity; null keeps it hidden until a scroller is available. */
  revealOffset?: SharedValue<number> | null;
}

export function PageHeader({
  title,
  children,
  action,
  back = true,
  titleAlignment = back ? "center" : "start",
  onBack,
  revealOffset,
}: Readonly<PageHeaderProps>) {
  const router = useRouter();
  const { colors } = useTheme();
  const centered = titleAlignment === "center";
  const reducedMotion = useReducedMotion();
  const visibility = useDerivedValue(() => {
    if (revealOffset === undefined) {
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
      accessible: !hidden && Boolean(title),
      accessibilityElementsHidden: hidden,
      importantForAccessibility: hidden
        ? ("no-hide-descendants" as const)
        : ("auto" as const),
    };
  });
  let identity = <View style={styles.identity} />;
  if (children) {
    identity = (
      <Animated.View
        accessible={Boolean(title)}
        accessibilityRole="header"
        accessibilityLabel={title}
        animatedProps={accessibility}
        style={[styles.identity, centered && styles.centeredIdentity, reveal]}
      >
        {children}
      </Animated.View>
    );
  } else if (title) {
    identity = (
      <Animated.Text
        accessibilityRole="header"
        accessibilityLabel={title}
        numberOfLines={1}
        ellipsizeMode="tail"
        animatedProps={accessibility}
        style={[
          styles.title,
          centered && styles.centeredTitle,
          { color: colors.text },
          reveal,
        ]}
      >
        {title}
      </Animated.Text>
    );
  }
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
        <View style={[styles.centeredRail, styles.backRail]}>{backButton}</View>
      ) : (
        backButton
      )}
      {identity}
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
  backRail: { alignItems: "flex-start" },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  centeredRail: { width: tokens.size.control.default },
  identity: { flex: 1, minWidth: 0 },
  centeredIdentity: { alignItems: "center" },
  title: { ...tokens.typography.navigation, flex: 1, minWidth: 0 },
  centeredTitle: { textAlign: "center" },
});
