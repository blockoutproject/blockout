import { useIsFocused, useRoute } from "expo-router";
import { useEffect, useEffectEvent } from "react";
import { WebAuthError, WebAuthErrorCodes } from "react-native-auth0";
import { ApiError } from "@/shared/api/api-fetch";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { TECHNICAL_ERROR_TITLE } from "@/shared/components/error-copy";
import { useAccountSession } from "../session/account-session-provider";

const errorMessage = `${TECHNICAL_ERROR_TITLE}.`;

/** Keeps the originating invitation through the shared connection, including an Auth0 subject remount. */
export function useContextualSignIn(admitted: boolean) {
  const { key } = useRoute();
  const focused = useIsFocused();
  const session = useAccountSession();
  const { connection } = session;
  const ownsConnection = connection.variables?.invitation === key;
  const pending = ownsConnection && connection.isPending;
  const error = connection.error;
  const obsolete = error instanceof ApiError && error.kind === "cancelled";
  const failed = ownsConnection && connection.isError && !obsolete;
  const feedback = useActionFeedback();
  const showFailure = useEffectEvent(() => feedback.error(errorMessage));
  const clearFeedback = feedback.clear;
  useEffect(() => {
    if (!admitted || !focused) {
      clearFeedback("error");
      return;
    }
    const cancelled =
      error instanceof WebAuthError &&
      error.type === WebAuthErrorCodes.USER_CANCELLED;
    if (failed && !cancelled) {
      showFailure();
    }
  }, [admitted, focused, failed, error, clearFeedback]);

  const visible = session.status === "guest" || pending || failed;

  function start() {
    if (!admitted || !focused || !visible || session.operation) {
      return;
    }
    feedback.clear();
    const audience = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE;
    if (!audience) {
      feedback.error(errorMessage);
      return;
    }
    connection.mutate({ audience, signIn: session.signIn, invitation: key });
  }

  return { visible, pending, start };
}
