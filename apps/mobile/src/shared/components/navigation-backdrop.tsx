import type { ViewInstance } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type ComponentProps,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/** Measured pinned chrome clearance; scroll containers reserve it inside their content. */
export const NavigationInsetContext = createContext(0);

/** Page publishes the native top inset when its chrome extends behind the status bar. */
export const NavigationSafeAreaContext = createContext(0);

/** The current ordinary page's native scroller owns this offset; material and compact navigation only observe it. */
export const NavigationScrollOffsetContext =
  createContext<SharedValue<number> | null>(null);

/** Reads only layout clearance, independently of feature selection and scroll position. */
export function useNavigationInset() {
  return useContext(NavigationInsetContext);
}

/** Reveals native blur with scroll; a hidden resting view removes the material's tint. */
export function NavigationBackdrop({
  target,
  scrollOffset,
  style,
}: Readonly<{
  target: RefObject<ViewInstance | null>;
  scrollOffset: SharedValue<number>;
  /** Pagers size their material to the library's visible header and tab rail. */
  style?: ComponentProps<typeof Animated.View>["style"];
}>) {
  const { scheme } = useTheme();
  const progress = useDerivedValue(() =>
    Math.min(1, Math.max(0, scrollOffset.get()) / tokens.layout.header),
  );
  // UIKit visual effects require full ancestor alpha; animate the supported intensity instead.
  const reveal = useAnimatedStyle(() => ({
    opacity: progress.get() > 0 ? 1 : 0,
  }));
  const material = useAnimatedProps(() => ({
    intensity: Math.max(1, progress.get() * tokens.blur.navigation.intensity),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style, reveal]}
    >
      <AnimatedBlurView
        blurTarget={target}
        blurMethod="dimezisBlurView"
        tint={tokens.blur.navigation.tint[scheme]}
        animatedProps={material}
        blurReductionFactor={tokens.blur.navigation.androidReduction}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/** Ordinary pages render their scroll content below an independently measured, pinned header. */
export function PageViewport({
  header,
  children,
}: Readonly<{
  header: ReactNode;
  children: ReactNode;
}>) {
  const target = useRef<ViewInstance>(null);
  const top = useContext(NavigationSafeAreaContext);
  const scrollOffset = useSharedValue(0);
  const [height, setHeight] = useState(0);
  return (
    <View style={styles.fill}>
      <NavigationInsetContext value={height}>
        <NavigationScrollOffsetContext value={scrollOffset}>
          {/* Keep content first in the native hierarchy so Stack can configure its scroll edge. */}
          <BlurTargetView ref={target} collapsable={false} style={styles.fill}>
            {children}
          </BlurTargetView>
          <View
            style={[styles.header, { paddingTop: top }]}
            onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
          >
            <NavigationBackdrop target={target} scrollOffset={scrollOffset} />
            {header}
          </View>
        </NavigationScrollOffsetContext>
      </NavigationInsetContext>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0 },
});
