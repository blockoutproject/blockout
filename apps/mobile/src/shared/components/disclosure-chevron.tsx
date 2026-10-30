import { ChevronDown } from "lucide-react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../theme/theme-provider";
import { useReducedMotion } from "../theme/use-reduced-motion";
import { tokens } from "../theme/tokens";

/** Decorative disclosure direction; the enclosing control owns the accessible expanded state. */
export interface DisclosureChevronProps {
  expanded: boolean;
}

/** One shared down-to-up rotation for expandable rows, respecting the application's reduced-motion owner. */
export function DisclosureChevron({ expanded }: DisclosureChevronProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const animated = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(expanded ? "180deg" : "0deg", {
          duration: reducedMotion ? 0 : tokens.motion.navigation.duration,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
      },
    ],
  }));
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={animated}
    >
      <ChevronDown size={tokens.size.icon.md} color={colors.icon} />
    </Animated.View>
  );
}
