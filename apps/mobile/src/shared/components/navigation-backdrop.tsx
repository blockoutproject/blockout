import type { ViewInstance } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { useNavigation } from "expo-router";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
  type ComponentProps,
} from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { ScrollViewMarker } from "react-native-screens/experimental";
import { stackScreenOptions } from "@/shared/native/stack-screen-options";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const easeBlurReveal = Easing.out(Easing.quad);
const softScrollEdge = { top: "soft" } as const;
const NativeNavigationEdgeContext = createContext(false);

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

/** Configures new iOS scrollers; Stack applies the same edge policy when reattaching routes. */
export function NavigationScrollMarker({
  children,
}: Readonly<{ children: ReactElement }>) {
  const useSoftEdge = useContext(NativeNavigationEdgeContext);
  if (Platform.OS !== "ios") {
    return children;
  }
  return (
    <ScrollViewMarker
      style={styles.fill}
      scrollEdgeEffects={
        useSoftEdge ? softScrollEdge : stackScreenOptions.scrollEdgeEffects
      }
    >
      {children}
    </ScrollViewMarker>
  );
}

function SoftNavigationEdgeOptions() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    // Stack reapplies its option on attachment; keep it aligned with the mounted scroller.
    navigation.setOptions({ scrollEdgeEffects: softScrollEdge });
    return () => {
      navigation.setOptions({
        scrollEdgeEffects: stackScreenOptions.scrollEdgeEffects,
      });
    };
  }, [navigation]);
  return null;
}

function useSoftNavigationEdge(ownsStackScrollEdge: boolean) {
  const supported =
    ownsStackScrollEdge &&
    Platform.OS === "ios" &&
    Number.parseInt(String(Platform.Version), 10) >= 26;
  const [reducedTransparency, setReducedTransparency] = useState(true);
  useEffect(() => {
    if (!supported) {
      return;
    }

    let acceptInitialRead = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      (value) => {
        acceptInitialRead = false;
        setReducedTransparency(value);
      },
    );
    void AccessibilityInfo.isReduceTransparencyEnabled().then(
      (value) => {
        if (acceptInitialRead) {
          setReducedTransparency(value);
        }
      },
      () => {
        // Keep the existing material if the system setting is unavailable.
      },
    );
    return () => {
      acceptInitialRead = false;
      subscription.remove();
    };
  }, [supported]);
  // Under Reduce Transparency the native edge can leave the custom controls uncovered.
  return supported && !reducedTransparency;
}

/** One Expo material follows the scroll offset for ordinary pages and paged scenes. */
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
  const fadeLayer = Platform.OS === "android";
  const progress = useDerivedValue(() => {
    const amount = Math.min(
      1,
      Math.max(0, scrollOffset.get()) / tokens.layout.header,
    );
    return easeBlurReveal(amount);
  });
  // Fade Android's grain with the material. UIKit requires full alpha while visible.
  const reveal = useAnimatedStyle(() => {
    const amount = progress.get();
    return { opacity: fadeLayer ? amount : Number(amount > 0) };
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
      style={[StyleSheet.absoluteFill, style, reveal]}
    >
      <AnimatedBlurView
        blurTarget={target}
        blurMethod="dimezisBlurView"
        tint={tokens.blur.navigation.headerTint[scheme]}
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
  ownsStackScrollEdge = false,
}: Readonly<{
  header: ReactNode;
  children: ReactNode;
  /** Overlays and standalone previews keep their own material without setting route options. */
  ownsStackScrollEdge?: boolean;
}>) {
  const target = useRef<ViewInstance>(null);
  const top = useContext(NavigationSafeAreaContext);
  const scrollOffset = useSharedValue(0);
  const [height, setHeight] = useState(0);
  const useSoftEdge = useSoftNavigationEdge(ownsStackScrollEdge);
  return (
    <View style={styles.fill}>
      {useSoftEdge && <SoftNavigationEdgeOptions />}
      <NavigationInsetContext value={height}>
        <NavigationScrollOffsetContext value={scrollOffset}>
          <BlurTargetView ref={target} style={styles.fill}>
            <NativeNavigationEdgeContext value={useSoftEdge}>
              {children}
            </NativeNavigationEdgeContext>
          </BlurTargetView>
          <View
            style={[styles.header, { paddingTop: top }]}
            onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
          >
            {!useSoftEdge && (
              <NavigationBackdrop target={target} scrollOffset={scrollOffset} />
            )}
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
