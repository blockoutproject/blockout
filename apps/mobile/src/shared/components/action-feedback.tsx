import { Check, CircleAlert } from "lucide-react-native";
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
  ReduceMotion,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { TECHNICAL_ERROR } from "./error-copy";

/** One transient action notice; its lifetime never owns or releases command recovery. */
interface Notice {
  owner: object;
  scopeKey: string;
  message: string;
  tone: "error" | "success";
}

/** Internal root presentation boundary; feature hooks supply a mounted interaction owner. */
interface ActionFeedbackContext {
  show(
    owner: object,
    message: string,
    tone: Notice["tone"],
    nextScope?: string,
  ): void;
  clear(owner: object, tone?: Notice["tone"]): void;
}

const FeedbackContext = createContext<ActionFeedbackContext | null>(null);

/** Private presentation follows the supplied session scope; this owner stores no command or retry state. */
export interface ActionFeedbackProviderProps extends PropsWithChildren {
  scopeKey: string;
}

/**
 * Projects action notices above native navigation without moving content or focus.
 * The newest event replaces the previous toast. Presentation expiry and unmount never change a mutation.
 * The iOS window overlay stays non-modal so VoiceOver can reach the page even when no toast is visible.
 */
export function ActionFeedbackProvider({
  children,
  scopeKey,
}: Readonly<ActionFeedbackProviderProps>) {
  const [notice, setNotice] = useState<Notice>();
  const currentScope = useRef(scopeKey);
  useLayoutEffect(() => {
    currentScope.current = scopeKey;
  }, [scopeKey]);

  /** Shows only a current-scope event and leaves the existing request/form owners untouched. */
  const show = useCallback(
    (
      owner: object,
      message: string,
      tone: Notice["tone"],
      nextScope?: string,
    ) => {
      if (nextScope === undefined && currentScope.current !== scopeKey) {
        return;
      }
      setNotice({ owner, scopeKey: nextScope ?? scopeKey, message, tone });
    },
    [scopeKey],
  );

  /** An old route cannot dismiss a newer route's notice. */
  const clear = useCallback((owner: object, tone?: Notice["tone"]) => {
    setNotice((current) =>
      current?.owner === owner && (tone === undefined || current.tone === tone)
        ? undefined
        : current,
    );
  }, []);

  useEffect(() => {
    if (!notice || notice.scopeKey !== scopeKey) {
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const duration = Math.max(
      notice.tone === "success" ? 4_000 : 6_000,
      notice.message.length * 60,
    );

    /** Uses the native accessibility timeout where supported; failure retains the approved duration. */
    function expireAfter(milliseconds: number) {
      if (!active) {
        return;
      }
      timer = setTimeout(() => {
        setNotice((current) => (current === notice ? undefined : current));
      }, milliseconds);
    }

    if (Platform.OS === "android") {
      void AccessibilityInfo.getRecommendedTimeoutMillis(duration).then(
        expireAfter,
        () => expireAfter(duration),
      );
    } else {
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
        {visible && (
          <ActionToast message={visible.message} tone={visible.tone} />
        )}
      </SafeAreaView>
    </View>
  );
  return (
    <FeedbackContext value={{ show, clear }}>
      {children}
      {Platform.OS === "ios" ? (
        <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
          {overlay}
        </FullWindowOverlay>
      ) : (
        overlay
      )}
    </FeedbackContext>
  );
}

/**
 * Supplies event-only feedback for the mounted original interaction.
 * Pass safe product copy; field validation and domain outcome presentation remain with their owners.
 * An acknowledged action that closes its route may retain its published success until the
 * ordinary timeout or a session change. Errors leave with their interaction owner.
 */
export function useActionFeedback({ retainSuccessOnUnmount = false } = {}) {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("Action feedback requires ActionFeedbackProvider");
  }
  const owner = useRef({});
  const mounted = useRef(false);
  const { clear } = context;
  const clearFeedback = useCallback(
    (tone?: Notice["tone"]) => clear(owner.current, tone),
    [clear],
  );
  useLayoutEffect(() => {
    mounted.current = true;
    const identity = owner.current;
    return () => {
      mounted.current = false;
      clear(identity, retainSuccessOnUnmount ? "error" : undefined);
    };
  }, [clear, retainSuccessOnUnmount]);
  return {
    /**
     * Replaces feedback for a live event. A session-changing continuation may supply its new scope
     * within the owning mounted account lifetime; ordinary commands use the captured scope.
     */
    error(message = TECHNICAL_ERROR, nextScope?: string) {
      if (mounted.current) {
        context.show(owner.current, message, "error", nextScope);
      }
    },
    /** Confirms an acknowledged write from its live owner in the current session. */
    success(message: string) {
      if (mounted.current) {
        context.show(owner.current, message, "success");
      }
    },
    /** Retires this interaction's previous feedback, optionally only the supplied tone. */
    clear: clearFeedback,
  };
}

/** Uses the live theme to enable motion because Reanimated's default uses the startup preference. */
function ActionToast({
  message,
  tone,
}: Readonly<Pick<Notice, "message" | "tone">>) {
  const { colors, reducedMotion } = useTheme();
  const success = tone === "success";
  const ink = success ? colors.onSuccessSubtle : colors.error;
  const tint = success ? colors.successToastSubtle : colors.errorToastSubtle;
  const Icon = success ? Check : CircleAlert;
  const iconSize = success ? tokens.size.icon.sm : tokens.size.icon.md;
  const iconColor = success ? colors.text : ink;
  const duration = 240;

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
              reduceMotion: ReduceMotion.Never,
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
              reduceMotion: ReduceMotion.Never,
            }),
          },
        ],
      },
    };
  }

  return (
    <Animated.View
      entering={reducedMotion ? undefined : enter}
      exiting={reducedMotion ? undefined : exit}
      style={[
        styles.surface,
        success && styles.successSurface,
        { backgroundColor: colors.surface, borderColor: ink },
      ]}
    >
      <View
        style={[
          styles.message,
          success && styles.successMessage,
          { backgroundColor: tint },
        ]}
      >
        <Icon accessible={false} size={iconSize} color={iconColor} />
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            success ? styles.successCopy : styles.errorCopy,
            { color: ink },
          ]}
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
  successSurface: {
    alignSelf: "center",
    borderRadius: tokens.radius.panelInset,
  },
  message: {
    padding: tokens.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.compact,
  },
  successMessage: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  errorCopy: { ...tokens.typography.body, flex: 1 },
  successCopy: { ...tokens.typography.label, flexShrink: 1 },
});
