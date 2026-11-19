import type { ViewInstance } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
  type ComponentProps,
} from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { ScrollViewMarker } from "react-native-screens/experimental";
import { PageScrollContext } from "./page-scroll-binding";
import { stackScreenOptions } from "@/shared/native/stack-screen-options";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const supportsNavigationBlur =
  Platform.OS !== "android" || Number(Platform.Version) >= 31;

/** Page publishes the native top inset when its chrome extends behind the status bar. */
export const NavigationSafeAreaContext = createContext(0);

/** Apply the Stack edge policy when an iOS scroller mounts after the screen attaches. */
export function NavigationScrollMarker({
  children,
}: Readonly<{ children: ReactElement }>) {
  if (Platform.OS !== "ios" || Number.parseInt(Platform.Version, 10) < 26) {
    return children;
  }
  return (
    <ScrollViewMarker
      style={styles.fill}
      scrollEdgeEffects={stackScreenOptions.scrollEdgeEffects}
    >
      {children}
    </ScrollViewMarker>
  );
}

/** Reveals one shared material with scroll and uses the semantic tint on older Android. */
export function NavigationBackdrop({
  target,
  scrollOffset,
  style,
}: Readonly<{
  target: RefObject<ViewInstance | null>;
  scrollOffset: SharedValue<number>;
  /** Pagers size their material to the visible header and tab rail. */
  style?: ComponentProps<typeof Animated.View>["style"];
}>) {
  const { scheme } = useTheme();
  const progress = useDerivedValue(() =>
    Math.min(1, Math.max(0, scrollOffset.get()) / tokens.layout.header),
  );
  // UIKit visual effects require full ancestor alpha. Only the fallback fades as a view.
  const reveal = useAnimatedStyle(() => {
    const amount = progress.get();
    return { opacity: supportsNavigationBlur ? Number(amount > 0) : amount };
  });
  const material = useAnimatedProps(() => ({
    intensity: Math.max(
      1,
      progress.get() * tokens.blur.navigation.headerIntensity,
    ),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        !supportsNavigationBlur && {
          backgroundColor: tokens.blur.navigation.headerVeil[scheme],
        },
        style,
        reveal,
      ]}
    >
      {supportsNavigationBlur && (
        <AnimatedBlurView
          blurTarget={target}
          blurMethod="dimezisBlurViewSdk31Plus"
          tint={tokens.blur.navigation.headerTint[scheme]}
          animatedProps={material}
          blurReductionFactor={tokens.blur.navigation.androidReduction}
          style={StyleSheet.absoluteFill}
        />
      )}
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
      <PageScrollContext value={{ offset: scrollOffset, contentInset: height }}>
        <BlurTargetView ref={target} style={styles.fill}>
          {children}
        </BlurTargetView>
        <View
          style={[styles.header, { paddingTop: top }]}
          onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
        >
          <NavigationBackdrop target={target} scrollOffset={scrollOffset} />
          {header}
        </View>
      </PageScrollContext>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0 },
});
