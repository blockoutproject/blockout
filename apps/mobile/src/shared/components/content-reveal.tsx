import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from "react";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";

const {
  initialTranslateY,
  duration: revealDuration,
  stagger,
  easing,
} = tokens.motion.contentReveal;
const easeOut = Easing.bezierFn(...easing);

function styleAtProgress(progress: number) {
  "worklet";
  return {
    opacity: progress,
    transform: [{ translateY: initialTranslateY * (1 - progress) }],
  };
}

const initialStyle = styleAtProgress(0);
const settledStyle = styleAtProgress(1);

/** Common detail admission can hide mounted scenes until their first presentation is possible. */
export const ContentRevealReadyContext = createContext(true);

interface ContentRevealStyle {
  order: SharedValue<readonly string[] | null>;
  elapsed: SharedValue<number>;
  blockDelay: number;
  reducedMotion: boolean;
}

export type ContentRevealOptions = Readonly<{ staggered?: boolean }>;

/** One presentation samples the visible blocks. Recycled views read the same elapsed animation. */
export function useContentReveal({
  staggered = false,
}: ContentRevealOptions = {}) {
  const blockDelay = staggered ? stagger : 0;
  const ready = useContext(ContentRevealReadyContext);
  const { reducedMotion } = useTheme();
  // Null waits for the initial sample. An empty sample keeps every block settled.
  const order = useSharedValue<readonly string[] | null>(null);
  const elapsed = useSharedValue(0);
  const started = useRef(false);

  const start = useCallback(
    (visibleKeys: readonly string[]) => {
      if (!ready) {
        return false;
      }
      if (started.current) {
        return true;
      }
      started.current = true;
      scheduleOnUI(
        (keys: readonly string[], reduce: boolean) => {
          "worklet";
          order.set(reduce ? [] : keys);
          if (!reduce && keys.length) {
            const duration = revealDuration + (keys.length - 1) * blockDelay;
            elapsed.set(
              withTiming(
                duration,
                {
                  duration,
                  easing: Easing.linear,
                  reduceMotion: ReduceMotion.Never,
                },
                (finished) => {
                  if (finished) {
                    order.set([]);
                  }
                },
              ),
            );
          }
        },
        visibleKeys,
        reducedMotion,
      );
      return true;
    },
    [blockDelay, elapsed, order, ready, reducedMotion],
  );

  const style: ContentRevealStyle = {
    order,
    elapsed,
    blockDelay,
    reducedMotion,
  };
  return { start, style };
}

/** Captures shared values directly so each mounted portion observes its owner's progress. */
function useContentRevealStyle(style: ContentRevealStyle, key: string) {
  return useAnimatedStyle(() => {
    if (style.reducedMotion) {
      return settledStyle;
    }
    const keys = style.order.get();
    if (keys === null) {
      return initialStyle;
    }
    const index = keys.indexOf(key);
    if (index === -1) {
      return settledStyle;
    }
    const progress =
      (style.elapsed.get() - index * style.blockDelay) / revealDuration;
    if (progress <= 0) {
      return initialStyle;
    }
    if (progress >= 1) {
      return settledStyle;
    }
    return styleAtProgress(easeOut(progress));
  });
}

export type ContentReveal = ReturnType<typeof useContentReveal>;

/** Moves and fades one block within its existing layout and input ownership. */
export function ContentRevealBlock({
  reveal,
  blockKey,
  style,
  ...props
}: Readonly<
  ComponentProps<typeof Animated.View> & {
    reveal: ContentReveal;
    blockKey: string;
  }
>) {
  const motion = useContentRevealStyle(reveal.style, blockKey);
  return <Animated.View {...props} style={[style, motion]} />;
}

/** Uses the same reveal for one existing content block once its owner presents it. */
export function useSingleContentReveal(visible: boolean) {
  const { style, start } = useContentReveal();
  useLayoutEffect(() => {
    if (visible) {
      start(["content"]);
    }
  }, [start, visible]);

  return useContentRevealStyle(style, "content");
}
