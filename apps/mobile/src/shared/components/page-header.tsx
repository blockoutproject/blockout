import { homeHref } from "@/shared/native/home-href";
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
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
  /** An owner-supplied action remains available independently of the detail read. */
  action?: ReactNode;
  back?: boolean;
  /** A nested destination can leave through its own stack instead of the global tab history. */
  onBack?: () => void;
  /** Native scroll distance reveals only the center; null keeps it hidden until a scroller is available. */
  revealOffset?: SharedValue<number> | null;
}

/** Native action layout reserves equal side rails so the one-line identity stays centered without overlapping actions. */
export function PageHeader({
  title,
  children,
  action,
  back = true,
  onBack,
  revealOffset,
}: Readonly<PageHeaderProps>) {
  const router = useRouter();
  const { colors } = useTheme();
  const [actionWidth, setActionWidth] = useState(tokens.size.control.default);
  const reducedMotion = useReducedMotion();
  const visibility = useDerivedValue(() => {
    const progress =
      revealOffset === undefined
        ? 1
        : clamp(
            (revealOffset?.get() ?? 0) /
              tokens.motion.navigation.headerRevealDistance,
            0,
            1,
          );
    if (reducedMotion) {
      return progress >= 1 ? 1 : 0;
    }
    return Easing.quad(progress);
  });
  const center = useAnimatedStyle(() => ({ opacity: visibility.get() }));
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
  let identity = <View style={styles.title} />;
  if (children) {
    identity = (
      <Animated.View
        accessible={Boolean(title)}
        accessibilityRole="header"
        accessibilityLabel={title}
        animatedProps={accessibility}
        style={[styles.middle, center]}
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
        style={[styles.title, { color: colors.text }, center]}
      >
        {title}
      </Animated.Text>
    );
  }
  return (
    <View style={styles.header}>
      <View style={[styles.rail, { width: actionWidth }]}>
        {back && (
          <IconButton
            label="Retour"
            onPress={
              onBack ??
              (() =>
                router.canGoBack() ? router.back() : router.replace(homeHref))
            }
          >
            <ChevronLeft
              accessible={false}
              color={colors.icon}
              size={tokens.size.icon.lg}
            />
          </IconButton>
        )}
      </View>
      {identity}
      <View
        style={styles.actions}
        onLayout={({ nativeEvent }) => setActionWidth(nativeEvent.layout.width)}
      >
        {action}
      </View>
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
  rail: { alignItems: "flex-start" },
  actions: {
    minWidth: tokens.size.control.default,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  middle: { flex: 1, minWidth: 0, alignItems: "center" },
  title: { ...tokens.typography.navigation, flex: 1, textAlign: "center" },
});
