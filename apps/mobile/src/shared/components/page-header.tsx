import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";
import { useReducedMotion } from "../theme/use-reduced-motion";

/** Ordinary page chrome; the default Back uses global history or Home, while nested owners can supply their departure. */
export interface PageHeaderProps {
  title?: string;
  /** A composed compact identity may replace the plain title between the navigation rails. */
  children?: ReactNode;
  /** An owner-supplied action remains available independently of the detail read. */
  action?: ReactNode;
  /** A nested destination can leave through its own stack instead of the global tab history. */
  onBack?: () => void;
  /** Native normalized reveal affects only the center; navigation and actions remain available. */
  revealProgress?: SharedValue<number>;
}

/** Native action layout reserves equal side rails so the one-line identity stays centered without overlapping actions. */
export function PageHeader({
  title,
  children,
  action,
  onBack,
  revealProgress,
}: Readonly<PageHeaderProps>) {
  const router = useRouter();
  const { colors } = useTheme();
  const [actionWidth, setActionWidth] = useState(tokens.size.control.default);
  const reducedMotion = useReducedMotion();
  const visibility = useDerivedValue(() => {
    const progress = revealProgress?.get() ?? 1;
    if (reducedMotion) {
      return progress >= 1 ? 1 : 0;
    }
    return progress;
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
        <IconButton
          label="Retour"
          onPress={
            onBack ??
            (() => (router.canGoBack() ? router.back() : router.replace("/")))
          }
        >
          <ChevronLeft
            accessible={false}
            color={colors.icon}
            size={tokens.size.icon.lg}
          />
        </IconButton>
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
