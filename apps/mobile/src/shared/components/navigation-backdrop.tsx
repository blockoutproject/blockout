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
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

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

/** One material fades in with native scrolling; opacity also removes Expo's tint entirely at the top. */
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
  const reveal = useAnimatedStyle(() => ({
    opacity: Math.min(
      1,
      Math.max(0, scrollOffset.get()) / tokens.layout.header,
    ),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style, reveal]}
    >
      <BlurView
        blurTarget={target}
        blurMethod="dimezisBlurView"
        tint={scheme}
        intensity={tokens.blur.navigation.intensity}
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
  backdrop = true,
}: Readonly<{
  header: ReactNode;
  children: ReactNode;
  /** Pagers supply one continuous material for status, navigation, identity and tabs. */
  backdrop?: boolean;
}>) {
  const target = useRef<ViewInstance>(null);
  const top = useContext(NavigationSafeAreaContext);
  const scrollOffset = useSharedValue(0);
  const [height, setHeight] = useState(0);
  return (
    <View style={styles.fill}>
      <NavigationInsetContext value={height}>
        <NavigationScrollOffsetContext value={backdrop ? scrollOffset : null}>
          <BlurTargetView ref={target} style={styles.fill}>
            {children}
          </BlurTargetView>
          <View
            style={[styles.header, { paddingTop: top }]}
            onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
          >
            {backdrop && (
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
