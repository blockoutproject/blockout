import { useEffect, useLayoutEffect, useRef } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";

/** Native image actions; the mounted feature retains file preparation, draft intent and current authority. */
export interface ImageChoicesOptions {
  title: string;
  chooseLabel: string;
  removeLabel: string;
  disabled: boolean;
  onChoose: () => void;
  onRemove?: () => void;
}

/**
 * Opens one system menu per mounted field, then releases it before invoking the latest authorized action.
 * iOS can dismiss its still-active menu on withdrawal. Android's Alert API has no dismissal handle;
 * withdrawal retires its callbacks, so a visible obsolete button cannot change the draft or open Photos.
 */
export function useImageChoices(options: ImageChoicesOptions) {
  const mounted = useRef(false);
  const latest = useRef(options);
  const inFlight = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    const removalWithdrawn = latest.current.onRemove && !options.onRemove;
    latest.current = options;
    if (options.disabled || removalWithdrawn) {
      inFlight.current?.();
    }
  }, [options]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      inFlight.current?.();
    };
  }, []);

  /** Native selection is consumed once; an old callback cannot act on, or retire, a later menu. */
  function open() {
    const current = latest.current;
    if (!mounted.current || current.disabled || inFlight.current) {
      return;
    }

    /** The OS owns menu dismissal; release this visit before handing off to Photos. */
    function finish(action?: "choose" | "remove") {
      if (inFlight.current !== retire) {
        return;
      }
      inFlight.current = undefined;
      const authorized = latest.current;
      if (!mounted.current || authorized.disabled) {
        return;
      }
      if (action === "choose") {
        authorized.onChoose();
      } else if (action === "remove") {
        authorized.onRemove?.();
      }
    }

    /** Only an outstanding menu from this visit may be dismissed; no feature action runs during cleanup. */
    function retire() {
      if (inFlight.current !== retire) {
        return;
      }
      inFlight.current = undefined;
      if (Platform.OS === "ios") {
        ActionSheetIOS.dismissActionSheet();
      }
    }

    inFlight.current = retire;
    if (Platform.OS === "ios") {
      const labels = [current.chooseLabel];
      if (current.onRemove) {
        labels.push(current.removeLabel);
      }
      labels.push("Annuler");
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: current.title,
          options: labels,
          cancelButtonIndex: labels.length - 1,
          destructiveButtonIndex: current.onRemove ? 1 : undefined,
        },
        (index) => {
          if (index === 0) {
            finish("choose");
          } else if (current.onRemove && index === 1) {
            finish("remove");
          } else {
            finish();
          }
        },
      );
    } else {
      Alert.alert(
        current.title,
        undefined,
        [
          ...(current.onRemove
            ? [{ text: current.removeLabel, onPress: () => finish("remove") }]
            : []),
          { text: "Annuler", style: "cancel", onPress: () => finish() },
          { text: current.chooseLabel, onPress: () => finish("choose") },
        ],
        { cancelable: true, onDismiss: () => finish() },
      );
    }
  }

  return open;
}
