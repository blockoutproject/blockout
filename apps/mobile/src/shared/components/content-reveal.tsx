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
  initialOpacity,
  duration: fadeDuration,
  stagger,
  easing,
} = tokens.motion.contentReveal;
const easeOut = Easing.bezierFn(...easing);

/** Common detail admission can hide mounted scenes until their first presentation is possible. */
export const ContentRevealReadyContext = createContext(true);

interface ContentRevealStyle {
  order: SharedValue<readonly string[] | null>;
  elapsed: SharedValue<number>;
  reducedMotion: boolean;
}

/** One presentation samples the visible blocks. Recycled views read the same elapsed animation. */
export function useContentReveal() {
  const ready = useContext(ContentRevealReadyContext);
  const { reducedMotion } = useTheme();
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
            const duration = fadeDuration + (keys.length - 1) * stagger;
            elapsed.set(
              withTiming(duration, {
                duration,
                easing: Easing.linear,
                reduceMotion: ReduceMotion.Never,
              }),
            );
          }
        },
        visibleKeys,
        reducedMotion,
      );
      return true;
    },
    [elapsed, order, ready, reducedMotion],
  );

  const style: ContentRevealStyle = {
    order,
    elapsed,
    reducedMotion,
  };
  return { start, style };
}

/** Captures shared values directly so each mounted portion observes its owner's progress. */
function useContentRevealStyle(style: ContentRevealStyle, key: string) {
  return useAnimatedStyle(() => {
    if (style.reducedMotion) {
      return { opacity: 1 };
    }
    const keys = style.order.get();
    if (keys === null) {
      return { opacity: initialOpacity };
    }
    const elapsed = style.elapsed.get();
    if (elapsed >= fadeDuration + (keys.length - 1) * stagger) {
      return { opacity: 1 };
    }
    const index = keys.indexOf(key);
    if (index === -1) {
      return { opacity: 1 };
    }
    const progress = Math.min(
      1,
      Math.max(0, (elapsed - index * stagger) / fadeDuration),
    );
    return {
      opacity: initialOpacity + (1 - initialOpacity) * easeOut(progress),
    };
  });
}

export type ContentReveal = ReturnType<typeof useContentReveal>;

/** Applies opacity to one block without owning its layout or input. */
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
  const fade = useContentRevealStyle(reveal.style, blockKey);
  return <Animated.View {...props} style={[style, fade]} />;
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
