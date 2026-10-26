import { CircleAlert } from "lucide-react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { useReducedMotion } from "../theme/use-reduced-motion";
import { TECHNICAL_ERROR } from "./error-copy";

/** One safe error presentation; its lifetime never owns or releases command recovery. */
interface ErrorNotice {
  owner: object;
  scopeKey: string;
  message: string;
}

/** Internal root presentation boundary; feature hooks supply a mounted interaction owner. */
interface ActionFeedbackContext {
  error(owner: object, message: string, nextScope?: string): void;
  clear(owner: object): void;
}

const FeedbackContext = createContext<ActionFeedbackContext | null>(null);

/** Private presentation follows the supplied session scope; this owner stores no command or retry state. */
export interface ActionFeedbackProviderProps extends PropsWithChildren {
  scopeKey: string;
}

/**
 * Projects UI Library Error Toast 3326:321 above native navigation without moving content or focus.
 * The newest failure replaces the previous toast. Expiry and unmount never acknowledge an uncertain write.
 */
export function ActionFeedbackProvider({
  children,
  scopeKey,
}: ActionFeedbackProviderProps) {
  const [notice, setNotice] = useState<ErrorNotice>();
  const currentScope = useRef(scopeKey);
  useLayoutEffect(() => {
    currentScope.current = scopeKey;
  }, [scopeKey]);

  /** Shows only a current-scope event and leaves the existing request/form owners untouched. */
  const error = useCallback(
    (owner: object, message: string, nextScope?: string) => {
      if (nextScope === undefined && currentScope.current !== scopeKey) return;
      setNotice({ owner, scopeKey: nextScope ?? scopeKey, message });
    },
    [scopeKey],
  );

  /** An old route cannot dismiss a newer route's error. */
  const clear = useCallback((owner: object) => {
    setNotice((current) => (current?.owner === owner ? undefined : current));
  }, []);

  useEffect(() => {
    if (!notice || notice.scopeKey !== scopeKey) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const duration = Math.max(6_000, notice.message.length * 60);
    /** Uses the native accessibility timeout where supported; failure retains the approved duration. */
    function expireAfter(milliseconds: number) {
      if (!active) return;
      timer = setTimeout(() => {
        setNotice((current) => (current === notice ? undefined : current));
      }, milliseconds);
    }
    if (Platform.OS === "android")
      void AccessibilityInfo.getRecommendedTimeoutMillis(duration).then(
        expireAfter,
        () => expireAfter(duration),
      );
    else {
      AccessibilityInfo.announceForAccessibility(notice.message);
      expireAfter(duration);
    }
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [notice, scopeKey]);

  const visible = notice?.scopeKey === scopeKey ? notice : undefined;
  const overlay = (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SafeAreaView edges={["top", "left", "right"]}>
        {visible && <ErrorToast message={visible.message} />}
      </SafeAreaView>
    </View>
  );
  return (
    <FeedbackContext value={{ error, clear }}>
      {children}
      {Platform.OS === "ios" ? (
        <FullWindowOverlay>{overlay}</FullWindowOverlay>
      ) : (
        overlay
      )}
    </FeedbackContext>
  );
}

/**
 * Supplies event-only technical/functional failure feedback for the mounted original interaction.
 * Pass safe product copy; field validation and uncertain outcomes remain inline at their owning form.
 * A native handoff may retain an already-published notice after closing its route; late events
 * remain ignored, and the root still owns session invalidation and the ordinary toast timeout.
 */
export function useActionFeedback({ retainOnUnmount = false } = {}) {
  const context = useContext(FeedbackContext);
  if (!context)
    throw new Error("Action feedback requires ActionFeedbackProvider");
  const owner = useRef({});
  const mounted = useRef(false);
  const { clear } = context;
  useLayoutEffect(() => {
    mounted.current = true;
    const identity = owner.current;
    return () => {
      mounted.current = false;
      if (!retainOnUnmount) clear(identity);
    };
  }, [clear, retainOnUnmount]);
  return {
    /**
     * Replaces feedback for a live event. A session-changing continuation may supply its new scope
     * only after checking that generation is still current; ordinary commands use the captured scope.
     */
    error(message = TECHNICAL_ERROR, nextScope?: string) {
      if (mounted.current) context.error(owner.current, message, nextScope);
    },
    /** Retires this interaction's previous feedback when a new explicit action begins. */
    clear() {
      context.clear(owner.current);
    },
  };
}

/** Applies the approved surface, icon, typography and reduced-motion-aware entry/exit without gestures. */
function ErrorToast({ message }: { message: string }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 1 : 240;
  /** Reanimated receives the measured height, preserving the approved offscreen travel with text scaling. */
  function enter(values: EntryAnimationsValues) {
    "worklet";
    return {
      initialValues: {
        transform: [{ translateY: -(values.targetHeight + 60) }],
      },
      animations: {
        transform: [
          {
            translateY: withTiming(0, {
              duration,
              easing: Easing.bezier(0, 0, 0.58, 1),
            }),
          },
        ],
      },
    };
  }
  /** Presentation expiry animates only this surface and performs no domain callback. */
  function exit(values: ExitAnimationsValues) {
    "worklet";
    return {
      initialValues: { transform: [{ translateY: 0 }] },
      animations: {
        transform: [
          {
            translateY: withTiming(-(values.currentHeight + 60), {
              duration,
              easing: Easing.bezier(0.42, 0, 1, 1),
            }),
          },
        ],
      },
    };
  }
  return (
    <Animated.View
      entering={enter}
      exiting={exit}
      style={[
        styles.surface,
        { backgroundColor: colors.surface, borderColor: colors.error },
      ]}
    >
      <View
        style={[styles.message, { backgroundColor: colors.errorToastSubtle }]}
      >
        <CircleAlert
          accessible={false}
          size={tokens.size.icon.md}
          color={colors.error}
        />
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.copy, { color: colors.error }]}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  surface: {
    marginHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.sm,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
  },
  message: {
    padding: tokens.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.compact,
  },
  copy: { ...tokens.typography.body, flex: 1 },
});
