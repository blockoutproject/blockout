import { useEffect, useRef } from "react";
import { Alert } from "react-native";

/** Native action copy; callers retain validation, authority, dispatch and outcome ownership. */
export interface ActionConfirmation {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Awaits one native confirmation per mounted action owner. Concurrent requests, dismissal and
 * disposal decline the action; callbacks from a previous dialog cannot confirm another intent.
 * Callers must recheck their session/resource authority after acceptance and before dispatch.
 */
export function useActionConfirmation() {
  const mounted = useRef(false);
  const dismiss = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      dismiss.current?.();
    };
  }, []);

  /** Presents the actual platform dialog; the returned promise can be accepted only once. */
  function confirmAction({
    title,
    message,
    confirmLabel,
    cancelLabel = "Annuler",
    destructive = false,
  }: ActionConfirmation): Promise<boolean> {
    if (!mounted.current || dismiss.current) return Promise.resolve(false);
    return new Promise((resolve) => {
      /** Releases this dialog only; a retained callback cannot affect a later confirmation. */
      function finish(accepted: boolean) {
        if (dismiss.current !== cancel) return;
        dismiss.current = undefined;
        resolve(accepted && mounted.current);
      }
      /** Treats native dismissal and owner disposal as an explicit non-confirmation. */
      function cancel() {
        finish(false);
      }
      dismiss.current = cancel;
      Alert.alert(
        title,
        message,
        [
          { text: cancelLabel, style: "cancel", onPress: cancel },
          {
            text: confirmLabel,
            style: destructive ? "destructive" : "default",
            onPress: () => finish(true),
          },
        ],
        { cancelable: true, onDismiss: cancel },
      );
    });
  }

  return confirmAction;
}
