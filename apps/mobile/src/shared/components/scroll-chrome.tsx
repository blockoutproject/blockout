import { BlurTargetView } from "expo-blur";
import { useMemo, useState, type ComponentRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import {
  useAnimatedScrollHandler,
  useSharedValue,
  type ScrollHandlerProcessed,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "../theme/tokens";
import { ScrollBackdrop, type ScrollBlurTarget } from "./scroll-backdrop";

/** Forward the handler to one animated native scroller and reserve headerHeight in its content and refresh offset. */
export interface ScrollChromeContentProps {
  onScroll: ScrollHandlerProcessed;
  headerHeight: number;
}

/** Fixed page chrome owns its top inset; callers retain their native scroller, data, keyboard and refresh lifecycle. */
export interface ScrollChromeProps {
  header: ReactNode;
  children: (props: ScrollChromeContentProps) => ReactNode;
}

/** A measured header reveals the native backdrop of its sibling scroll target; progress stays on the UI thread. */
export function ScrollChrome({ header, children }: ScrollChromeProps) {
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(
    insets.top + tokens.layout.header,
  );
  const [mountedTarget, setMountedTarget] = useState<ComponentRef<
    typeof View
  > | null>(null);
  const target: ScrollBlurTarget = useMemo(
    () => (mountedTarget ? { current: mountedTarget } : undefined),
    [mountedTarget],
  );
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = Math.max(0, event.contentOffset.y);
  });
  return (
    <View style={styles.fill}>
      <BlurTargetView ref={setMountedTarget} style={styles.fill}>
        {children({ onScroll, headerHeight })}
      </BlurTargetView>
      <View
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: insets.top }]}
        onLayout={({ nativeEvent }) =>
          setHeaderHeight(nativeEvent.layout.height)
        }
      >
        <ScrollBackdrop
          target={target}
          scrollY={scrollY}
          height={headerHeight}
        />
        {header}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0 },
});
