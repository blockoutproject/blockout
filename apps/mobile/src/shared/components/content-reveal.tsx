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
} = tokens.motion.contentReveal;
const easeInOut = Easing.inOut(Easing.ease);

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
export const ContentRevealContext = createContext<{
  ready: boolean;
  precedingElapsed?: SharedValue<number>;
}>({ ready: true });

interface ContentRevealStyle {
  order: SharedValue<readonly string[] | null>;
  elapsed: SharedValue<number>;
  reducedMotion: boolean;
}

/** One presentation samples the visible blocks. Recycled views read the same elapsed animation. */
export function useContentReveal(active: boolean) {
  const { ready: admitted, precedingElapsed } =
    useContext(ContentRevealContext);
  const ready = active && admitted;
  const { reducedMotion } = useTheme();
  // Null waits for the initial sample. An empty sample keeps every block settled.
  const order = useSharedValue<readonly string[] | null>(null);
  const elapsed = useSharedValue(0);
  const started = useRef(false);

  useLayoutEffect(() => {
    // A retained scene may return before its original entrance would have finished.
    if (started.current && (!ready || reducedMotion)) {
      order.set([]);
      elapsed.set(revealDuration);
    }
  }, [elapsed, order, ready, reducedMotion]);

  const start = useCallback(
    (visibleKeys: readonly string[]) => {
      if (!ready || started.current) {
        return;
      }
      started.current = true;
      scheduleOnUI(
        (keys: readonly string[], reduce: boolean) => {
          "worklet";
          order.set(reduce ? [] : keys);
          if (reduce) {
            elapsed.set(revealDuration);
          } else if (keys.length) {
            // The initial scene waits only for the remainder of the identity's first step.
            const wait = precedingElapsed
              ? Math.max(0, stagger - precedingElapsed.get())
              : 0;
            const duration = revealDuration + (keys.length - 1) * stagger;
            elapsed.set(-wait);
            elapsed.set(
              withTiming(
                duration,
                {
                  duration: duration + wait,
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
    },
    [elapsed, order, precedingElapsed, ready, reducedMotion],
  );

  const style: ContentRevealStyle = {
    order,
    elapsed,
    reducedMotion,
  };
  return { ready, start, started, style };
}

/** Captures shared values directly so each mounted portion observes its owner's progress. */
function useContentRevealStyle(
  { order, elapsed, reducedMotion }: ContentRevealStyle,
  key: string,
) {
  return useAnimatedStyle(() => {
    if (reducedMotion) {
      return settledStyle;
    }
    const keys = order.get();
    if (keys === null) {
      return initialStyle;
    }
    const index = keys.indexOf(key);
    if (index === -1) {
      return settledStyle;
    }
    const progress = (elapsed.get() - index * stagger) / revealDuration;
    if (progress <= 0) {
      return initialStyle;
    }
    if (progress >= 1) {
      return settledStyle;
    }
    return styleAtProgress(easeInOut(progress));
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
  const { style, start } = useContentReveal(visible);
  useLayoutEffect(() => {
    start(["content"]);
  }, [start]);

  return {
    motion: useContentRevealStyle(style, "content"),
    elapsed: style.elapsed,
  };
}
