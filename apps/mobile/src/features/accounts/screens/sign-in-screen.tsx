import { Page, PageScrollView } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";
import { useRouter } from "expo-router";
import { ArrowUpRight } from "lucide-react-native";
import { useEffect, useEffectEvent } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebAuthError, WebAuthErrorCodes } from "react-native-auth0";
import { ApiError } from "@/shared/api/api-fetch";
import {
  AccessClubBand,
  compactAccessBandHeight,
} from "@/shared/components/access-club-band";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { Surface } from "@/shared/components/surface";

import { ScreenState } from "@/shared/components/screen-state";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { PublicAccountLinks } from "../components/public-account-links";
import { SignInArtwork } from "../components/sign-in-artwork";
import { SignInBackdrop } from "../components/sign-in-backdrop";
import { useGuestNavigation } from "../hooks/use-guest-navigation";
import { useAccountSession } from "../session/account-session-provider";
import type { SupportOrigin } from "@/features/support";
import { homeHref } from "@/shared/native/home-href";
import { useNativeSplashLayout } from "@/shared/native/native-splash-handoff";
import { TECHNICAL_ERROR_TITLE } from "@/shared/components/error-copy";

const connectionErrorMessage = `${TECHNICAL_ERROR_TITLE}.`;

/** Complete public admission supplied by F12; the route validates any requested return destination. */
export interface SignInScreenProps {
  admitted: boolean;
  /** Validated internal destination to resume after explicit authentication and establishment. */
  returnTo?: string;
}

/** Keeps login intent scoped to admitted navigation; blocking access discards the local journey. */
export function SignInScreen({
  admitted,
  returnTo,
}: Readonly<SignInScreenProps>) {
  return admitted ? (
    <SignInJourney returnTo={returnTo} />
  ) : (
    <Page>
      <PageScrollView>
        <ScreenState>
          <ErrorState />
        </ScreenState>
      </PageScrollView>
    </Page>
  );
}

/** Starts explicit establishment and returns to its destination for ordinary read recovery, without replaying an action. */
function SignInJourney({
  returnTo,
}: Readonly<Pick<SignInScreenProps, "returnTo">>) {
  const router = useRouter();
  const session = useAccountSession();
  const { colors } = useTheme();
  const connection = session.connection;
  const feedback = useActionFeedback();
  const guest = useGuestNavigation();
  const onLayout = useNativeSplashLayout();
  const busy = Boolean(session.operation) || session.status === "restoring";
  const initialConnection = connection.variables?.invitation === undefined;
  const failure =
    (initialConnection ? connection.error : null) ?? session.error;
  const cancelled = failure instanceof ApiError && failure.kind === "cancelled";
  let supportOrigin: SupportOrigin = { screen: "sign-in" };
  if (failure instanceof WebAuthError) {
    supportOrigin = {
      screen: "sign-in",
      failureStage: "authentication",
      failureReason:
        failure.type === WebAuthErrorCodes.USER_CANCELLED
          ? "cancelled"
          : "unavailable",
    };
  } else if (failure instanceof ApiError && !cancelled) {
    supportOrigin = {
      screen: "sign-in",
      failureStage: "account-establishment",
      failureReason: "unavailable",
    };
  }
  const showFailure = useEffectEvent(() => {
    feedback.error(connectionErrorMessage);
  });
  useEffect(() => {
    if (
      (initialConnection && connection.isError && !cancelled) ||
      session.status === "authentication-error" ||
      session.status === "initialization-error"
    ) {
      showFailure();
    }
  }, [
    initialConnection,
    connection.isError,
    connection.error,
    cancelled,
    session.status,
  ]);

  /** The command owner survives Auth0's subject remount; a successful process resumes its original destination. */
  async function signIn() {
    if (busy) {
      return;
    }
    feedback.clear();
    if (session.status === "initialization-error") {
      session.retryInitialization();
      return;
    }
    const audience = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE;
    if (!audience) {
      feedback.error(connectionErrorMessage);
      return;
    }
    try {
      await connection.mutateAsync({ audience, signIn: session.signIn });
      router.replace(returnTo ?? homeHref);
    } catch {
      // The currently mounted Login observes this command's failure, including after the subject remount.
    }
  }

  return (
    // The hero fits above the reserved band and the legal links stay in the bottom safe area.
    <View testID="sign-in-screen" onLayout={onLayout} style={styles.screen}>
      <SignInBackdrop />
      <SignInArtwork />
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.content}>
        <View style={styles.actionArea}>
          <AccessClubBand compact />
          <Surface
            style={[styles.actions, { boxShadow: colors.capsuleShadow }]}
          >
            <Button
              label="Se connecter"
              onPress={() => void signIn()}
              loading={busy}
              trailingIcon={ArrowUpRight}
              contentAlignment="space-between"
              rounded
              fullWidth
            />
            <Button
              label="Continuer en tant qu’invité"
              variant="secondary"
              onPress={() => void guest.continueAsGuest()}
              disabled={busy}
              loading={guest.pending}
              rounded
              fullWidth
            />
          </Surface>
        </View>
        <View style={styles.links}>
          <PublicAccountLinks supportOrigin={supportOrigin} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
  content: { flexShrink: 0, paddingBottom: tokens.spacing.sm },
  actionArea: {
    minHeight: compactAccessBandHeight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing.lg,
  },
  actions: {
    width: "76%",
    maxWidth: 360,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  links: { paddingHorizontal: tokens.spacing.lg },
});
