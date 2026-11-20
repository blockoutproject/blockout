import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
import type { LayoutChangeEvent } from "react-native";
import { useBottomContentInset } from "./bottom-content-inset";
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

export interface ContentRevealStyle {
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
export function useContentRevealStyle(
  style?: ContentRevealStyle,
  key?: string,
) {
  return useAnimatedStyle(() => {
    if (!style || !key) {
      return {};
    }
    if (style.reducedMotion) {
      return { opacity: 1 };
    }
    const keys = style.order.get();
    if (keys === null) {
      return { opacity: initialOpacity };
    }
    const index = keys.indexOf(key);
    if (index === -1) {
      return { opacity: 1 };
    }
    const progress = Math.min(
      1,
      Math.max(0, (style.elapsed.get() - index * stagger) / fadeDuration),
    );
    return {
      opacity: initialOpacity + (1 - initialOpacity) * easeOut(progress),
    };
  });
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

/** Samples the mounted sections against the first usable scroll viewport. */
export function useSectionContentReveal(ready: boolean) {
  const { style, start } = useContentReveal();
  const bottomInset = useBottomContentInset();
  const viewportHeight = useRef(0);
  const contentTop = useRef<number | null>(null);
  const positions = useRef(new Map<string, number>());
  const measured = useRef(false);
  const frame = useRef<number | null>(null);

  function present() {
    if (!ready || measured.current || frame.current !== null) {
      return;
    }
    // Native layout delivers the sibling geometry together before the next frame.
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (contentTop.current === null || !viewportHeight.current) {
        return;
      }
      const contentBottom =
        viewportHeight.current - bottomInset - contentTop.current;
      const visible = [...positions.current]
        .filter(([, top]) => top < contentBottom)
        .sort(([, first], [, second]) => first - second)
        .map(([key]) => key);
      if (positions.current.size && start(visible)) {
        measured.current = true;
        positions.current.clear();
      }
    });
  }

  useEffect(() => {
    present();
    return () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  });

  return {
    style,
    onViewportLayout(event: LayoutChangeEvent) {
      viewportHeight.current = event.nativeEvent.layout.height;
      present();
    },
    onContentLayout(event: LayoutChangeEvent) {
      contentTop.current = event.nativeEvent.layout.y;
      present();
    },
    onBlockLayout(block: string, event: LayoutChangeEvent) {
      if (!measured.current) {
        positions.current.set(block, event.nativeEvent.layout.y);
        present();
      }
    },
  };
}
