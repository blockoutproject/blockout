import { homeHref } from "@/shared/native/home-href";
import { ErrorState } from "@/shared/components/state-card";
import { useIsFocused, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import {
  SignInInvitation,
  SignInInvitationLoading,
} from "../components/sign-in-invitation";
import { useContextualSignIn } from "../hooks/use-contextual-sign-in";
import { useAccountSession } from "../session/account-session-provider";

/** F12 owns admission and the originating feature supplies the invitation copy. */
export interface SignInInvitationScreenProps {
  admitted: boolean;
  message: string;
  /** Validated internal destination used if the native stack no longer retains the origin. */
  returnTo?: string;
}

/** Presents the explicit connection on the invitation and dismisses it when the ordinary context is admitted. */
export function SignInInvitationScreen({
  admitted,
  message,
  returnTo,
}: Readonly<SignInInvitationScreenProps>) {
  const account = useAccountSession();
  const router = useRouter();
  const focused = useIsFocused();
  const signIn = useContextualSignIn(admitted);

  /** Use the captured internal destination if a new native subject remounted the stack. */
  const close = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(returnTo ?? homeHref);
    }
  }, [returnTo, router]);

  useEffect(() => {
    if (
      admitted &&
      focused &&
      account.status !== "restoring" &&
      !signIn.visible
    ) {
      close();
    }
  }, [admitted, focused, account.status, signIn.visible, close]);

  if (!admitted) {
    return (
      <Sheet title="Connexion" onClose={close}>
        <SheetContent>
          <ErrorState />
        </SheetContent>
      </Sheet>
    );
  }
  if (account.status === "restoring") {
    return (
      <Sheet title="Connexion" onClose={close}>
        <SheetContent>
          <SignInInvitationLoading />
        </SheetContent>
      </Sheet>
    );
  }
  if (!signIn.visible) {
    return null;
  }
  return (
    <SignInInvitation
      message={message}
      onClose={close}
      onSignIn={signIn.start}
      loading={signIn.pending}
    />
  );
}
