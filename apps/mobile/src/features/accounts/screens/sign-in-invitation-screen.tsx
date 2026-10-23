import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { RequestError } from "../../../shared/components/request-feedback";
import { SignInInvitation } from "../components/sign-in-invitation";
import { useAccountSession } from "../session/account-session-provider";

/** F12 owns admission; the originating feature supplies contextual copy, never a deferred command or destination. */
export interface SignInInvitationScreenProps {
  admitted: boolean;
  message: string;
}

/** Removes obsolete guest content and replaces this sheet with ordinary sign-in, carrying no continuation. */
export function SignInInvitationScreen({
  admitted,
  message,
}: SignInInvitationScreenProps) {
  const account = useAccountSession();
  const router = useRouter();
  const [openedFor] = useState(account.getSnapshot);
  const currentGuest =
    account.status === "guest" && account.isCurrent(openedFor.generation);

  /** Native back preserves the origin; a direct link without history safely returns home. */
  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  useEffect(() => {
    if (!admitted || account.status === "restoring") return;
    if (!currentGuest) {
      if (router.canGoBack()) router.back();
      else router.replace("/");
    }
  }, [admitted, account.status, currentGuest, router]);

  if (!admitted)
    return (
      <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
    );
  if (!currentGuest) return null;
  return (
    <SignInInvitation
      message={message}
      onClose={close}
      onSignIn={() => {
        if (account.isCurrent(openedFor.generation)) router.replace("/sign-in");
      }}
    />
  );
}
