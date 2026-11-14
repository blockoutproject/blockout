import { Page, PageScrollView } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";
import { useRouter } from "expo-router";
import { useEffect, useEffectEvent } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebAuthError, WebAuthErrorCodes } from "react-native-auth0";
import { ApiError } from "@/shared/api/api-fetch";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { LoadingIndicator } from "@/shared/components/loading-indicator";

import { ScreenState } from "@/shared/components/screen-state";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { PublicAccountLinks } from "../components/public-account-links";
import { SignInArtwork } from "../components/sign-in-artwork";
import { SignInClubRail } from "../components/sign-in-club-rail";
import { useGuestNavigation } from "../hooks/use-guest-navigation";
import { useAccountSession } from "../session/account-session-provider";
import type { SupportOrigin } from "@/features/support";
import { homeHref } from "@/shared/native/home-href";
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
  const busy = Boolean(session.operation) || session.status === "restoring";
  const failure = connection.error ?? session.error;
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
      (connection.isError && !cancelled) ||
      session.status === "authentication-error" ||
      session.status === "initialization-error"
    ) {
      showFailure();
    }
  }, [connection.isError, connection.error, cancelled, session.status]);

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
    // Only the decorative hero yields height; actions retain their native bottom inset and touch targets.
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <SignInArtwork />
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.content}>
        <View style={styles.inset}>
          <Text style={[styles.summary, { color: colors.text }]}>
            Les calendriers, les résultats disponibles et vos équipes, au même
            endroit.
          </Text>
        </View>
        <SignInClubRail />
        <View style={[styles.inset, styles.footer]}>
          <View style={styles.actions}>
            <Button
              label="Se connecter"
              onPress={() => void signIn()}
              loading={busy}
              fullWidth
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continuer en tant qu’invité"
              onPress={() => void guest.continueAsGuest()}
              disabled={busy || guest.pending}
              accessibilityState={{
                busy: guest.pending,
                disabled: busy || guest.pending,
              }}
              style={({ pressed }) => [
                styles.guest,
                {
                  backgroundColor: colors.subtle,
                  borderColor: colors.border,
                  opacity: pressed ? tokens.opacity.pressed : 1,
                },
              ]}
            >
              {guest.pending && <LoadingIndicator color={colors.icon} />}
              <Text
                numberOfLines={2}
                style={[styles.guestLabel, { color: colors.text }]}
              >
                Continuer en tant qu’invité
              </Text>
            </Pressable>
          </View>
          <PublicAccountLinks supportOrigin={supportOrigin} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexShrink: 0,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.md,
  },
  inset: { paddingHorizontal: 22 },
  footer: { gap: tokens.spacing.sm },
  actions: { gap: tokens.spacing.md },
  summary: tokens.typography.title,
  guest: {
    minHeight: tokens.size.control.default,
    padding: tokens.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: tokens.spacing.sm,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
  },
  guestLabel: {
    ...tokens.typography.strong,
    flexShrink: 1,
    textAlign: "center",
  },
});
