import { ErrorState } from "../../../shared/components/state-card";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
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
  const currentGuest = account.status === "guest";

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
      <Sheet title="Connexion" onClose={close}>
        <SheetContent>
          <ErrorState />
        </SheetContent>
      </Sheet>
    );
  if (account.status === "restoring")
    return (
      <Sheet title="Connexion" onClose={close}>
        <SheetContent>
          <RequestLoading />
        </SheetContent>
      </Sheet>
    );
  if (!currentGuest) return null;
  return (
    <SignInInvitation
      message={message}
      onClose={close}
      onSignIn={() => {
        if (currentGuest) router.replace("/sign-in");
      }}
    />
  );
}
