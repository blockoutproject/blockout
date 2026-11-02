import type { StyleProp, ViewInstance, ViewStyle } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** Measured pinned chrome clearance; scroll containers reserve it inside their content. */
export const NavigationInsetContext = createContext(0);

/** Page publishes the native top inset when its chrome extends behind the status bar. */
export const NavigationSafeAreaContext = createContext(0);

/** Reads only layout clearance, independently of feature selection and scroll position. */
export function useNavigationInset() {
  return useContext(NavigationInsetContext);
}

/** One native tinted blur material; the Android target must exclude this view. */
export function NavigationBackdrop({
  target,
  style,
}: {
  target: RefObject<ViewInstance | null>;
  /** A pager extends this single material over its measured tab rail. */
  style?: StyleProp<ViewStyle>;
}) {
  const { scheme } = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <BlurView
        blurTarget={target}
        blurMethod="dimezisBlurView"
        tint={scheme}
        intensity={tokens.blur.navigation.intensity}
        blurReductionFactor={tokens.blur.navigation.androidReduction}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/** Ordinary pages render their scroll content below an independently measured, pinned header. */
export function PageViewport({
  header,
  children,
  backdrop = true,
}: {
  header: ReactNode;
  children: ReactNode;
  /** Pagers supply one continuous material for status, navigation, identity and tabs. */
  backdrop?: boolean;
}) {
  const target = useRef<ViewInstance>(null);
  const top = useContext(NavigationSafeAreaContext);
  const [height, setHeight] = useState(0);
  return (
    <View style={styles.fill}>
      <NavigationInsetContext value={height}>
        <BlurTargetView ref={target} style={styles.fill}>
          {children}
        </BlurTargetView>
      </NavigationInsetContext>
      <View
        style={[styles.header, { paddingTop: top }]}
        onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
      >
        {backdrop && <NavigationBackdrop target={target} />}
        {header}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0 },
});
