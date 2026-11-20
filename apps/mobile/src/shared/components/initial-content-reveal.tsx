import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { StyleSheet, type ViewProps } from "react-native";
import { useIsFocused } from "expo-router";
import { NavigationContext } from "expo-router/react-navigation";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion as useLaunchReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { tokens } from "@/shared/theme/tokens";
import { useReducedMotion } from "@/shared/theme/use-reduced-motion";

export const initialRevealLimit = 4;

const stagger = 60;
const initialOpacity = 0.62;
const { duration, easing } = tokens.motion.compact;
const revealDuration = duration + stagger * (initialRevealLimit - 1);
const compactEasing = Easing.bezierFn(...easing);

const ContentMotionPreferenceContext = createContext(true);

const InitialContentRevealContext = createContext<{
  active: boolean;
  reducedMotion: boolean;
  progress: SharedValue<number>;
  presentedTabs: Set<string>;
  start(): void;
  finish(): void;
} | null>(null);

/** Shares the live preference with new pages instead of rereading the launch snapshot on each visit. */
export function ContentMotionPreference({ children }: PropsWithChildren) {
  const reducedMotion = useReducedMotion(useLaunchReducedMotion());
  return (
    <ContentMotionPreferenceContext value={reducedMotion}>
      {children}
    </ContentMotionPreferenceContext>
  );
}

export function PageContentRevealScope({ children }: PropsWithChildren) {
  const navigation = useContext(NavigationContext);
  return navigation ? (
    <FocusedPageRevealScope>{children}</FocusedPageRevealScope>
  ) : (
    <InitialContentRevealScope>{children}</InitialContentRevealScope>
  );
}

function FocusedPageRevealScope({ children }: PropsWithChildren) {
  const focused = useIsFocused();
  return (
    <InitialContentRevealScope active={focused}>
      {children}
    </InitialContentRevealScope>
  );
}

/** A page or retained tab gets one reveal even if its read surface or scroller is replaced. */
export function InitialContentRevealScope({
  children,
  active: admitted = true,
  resetKey,
  tabId,
}: PropsWithChildren<{
  active?: boolean;
  resetKey?: string;
  tabId?: string;
}>) {
  const parent = useContext(InitialContentRevealContext);
  const active = admitted && (parent?.active ?? true);
  const reduce = useContext(ContentMotionPreferenceContext);
  const parentTabs = parent?.presentedTabs;
  // Club replaces its whole pager when the season changes. The mounted page still remembers its tabs.
  const [alreadyPresented] = useState(
    () => tabId !== undefined && parentTabs?.has(tabId),
  );
  const [presentedTabs] = useState(() => new Set<string>());
  const progress = useSharedValue(alreadyPresented ? revealDuration : 0);
  const presented = useRef<{ resetKey: string | undefined }>(
    alreadyPresented ? { resetKey } : undefined,
  );
  const start = useCallback(() => {
    if (!active || presented.current) {
      return;
    }
    presented.current = { resetKey };
    if (tabId !== undefined) {
      parentTabs?.add(tabId);
    }
    if (reduce) {
      progress.set(revealDuration);
    } else {
      progress.set(
        withTiming(revealDuration, {
          duration: revealDuration,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.Never,
        }),
      );
    }
  }, [active, parentTabs, progress, reduce, resetKey, tabId]);
  const finish = useCallback(() => {
    if (presented.current) {
      progress.set(revealDuration);
    }
  }, [progress]);

  useLayoutEffect(() => {
    const replaced = presented.current?.resetKey !== resetKey;
    if (reduce || !active || replaced) {
      finish();
    }
  }, [active, finish, reduce, resetKey]);

  const value = useMemo(
    () => ({
      active,
      reducedMotion: reduce,
      progress,
      presentedTabs,
      start,
      finish,
    }),
    [active, finish, presentedTabs, progress, reduce, start],
  );
  return (
    <InitialContentRevealContext value={value}>
      {children}
    </InitialContentRevealContext>
  );
}

/** A user drag keeps newly encountered rows fully visible during a running first reveal. */
export function useFinishInitialContentReveal() {
  return useContext(InitialContentRevealContext)?.finish;
}

/** Starts the reveal at the presentation owner's existing usable-content boundary. */
export function useInitialContentReveal(ready: boolean) {
  const scope = useContext(InitialContentRevealContext);
  useLayoutEffect(() => {
    if (ready) {
      scope?.start();
    }
  }, [ready, scope]);
}

export function InitialContentRevealItem({
  index,
  style,
  ...props
}: ViewProps & { index?: number }) {
  // LegendList can retain the returned element when a scene becomes visible.
  const scope = useContext(InitialContentRevealContext);
  const progress =
    index !== undefined && index >= 0 && scope?.active && !scope.reducedMotion
      ? scope.progress
      : undefined;
  const opacity = StyleSheet.flatten(style)?.opacity ?? 1;
  const fade = useAnimatedStyle(() => {
    if (
      !progress ||
      index === undefined ||
      index < 0 ||
      index >= initialRevealLimit
    ) {
      return { opacity };
    }
    const elapsed = progress.get() - index * stagger;
    if (elapsed <= 0) {
      return { opacity: opacity * initialOpacity };
    }
    if (elapsed >= duration) {
      return { opacity };
    }
    return {
      opacity:
        opacity *
        (initialOpacity +
          (1 - initialOpacity) * compactEasing(elapsed / duration)),
    };
  });
  return <Animated.View {...props} style={[style, fade]} />;
}
