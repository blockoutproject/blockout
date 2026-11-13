import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import { Page, PageScrollView } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebAuthError, WebAuthErrorCodes } from "react-native-auth0";
import { ApiError } from "@/shared/api/api-fetch";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { LoadingIndicator } from "@/shared/components/loading-indicator";

import { ScreenState } from "@/shared/components/screen-state";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useEstablishAccount } from "../api/use-current-account";
import { PublicAccountLinks } from "../components/public-account-links";
import { SignInArtwork } from "../components/sign-in-artwork";
import { useGuestNavigation } from "../hooks/use-guest-navigation";
import { useAccountSession } from "../session/account-session-provider";
import type { SupportOrigin } from "@/features/support";

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
  const { colors, membership } = useTheme();
  const establishment = useEstablishAccount();
  const feedback = useActionFeedback();
  const guest = useGuestNavigation();
  const mounted = useRef(false);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [supportOrigin, setSupportOrigin] = useState<SupportOrigin>({
    screen: "sign-in",
  });
  const busy =
    session.status === "authenticating" ||
    session.status === "signing-out" ||
    establishment.isPending ||
    session.status === "restoring";
  const retryRestoration =
    session.status === "authentication-error" && !loginAttempted;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Restores the exact caller even when its deferred navigator remounts; ordinary login retains Profile. */
  function finishNavigation() {
    if (returnTo) {
      router.replace(returnTo);
    } else {
      router.replace("/profile");
    }
  }

  /** Completed authentication keeps ordinary read recovery; only a live authentication failure publishes feedback. */
  function handleSignInFailure(error: unknown, authenticating: boolean) {
    if (!authenticating) {
      finishNavigation();
      return;
    }
    if (!mounted.current) {
      return;
    }
    setSupportOrigin({
      screen: "sign-in",
      failureStage: authenticating ? "authentication" : "account-establishment",
      failureReason:
        error instanceof WebAuthError &&
        error.type === WebAuthErrorCodes.USER_CANCELLED
          ? "cancelled"
          : "unavailable",
    });
    let message: string | undefined;
    if (error instanceof WebAuthError) {
      if (error.type === WebAuthErrorCodes.USER_CANCELLED) {
        message = "Connexion annulée.";
      }
    }
    feedback.error(message);
  }

  /** Retries native preparation or starts explicit authentication/establishment; failures use the shared toast. */
  async function signIn() {
    if (busy || session.operation) {
      return;
    }
    setSupportOrigin({ screen: "sign-in" });
    feedback.clear();
    if (session.status === "initialization-error") {
      session.retryInitialization();
      return;
    }
    if (retryRestoration) {
      session.retryAuthentication();
      return;
    }
    const audience = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE;
    if (session.status !== "authenticated" && !audience) {
      feedback.error();
      return;
    }
    let authenticating = session.status !== "authenticated";
    try {
      let authenticated;
      if (session.status === "authenticated") {
        authenticated = session;
      } else {
        setLoginAttempted(true);
        authenticated = await session.signIn(audience ?? "");
      }
      if (!authenticated?.subject) {
        return;
      }
      authenticating = false;
      const attempt = establishment.mutateAsync({
        subject: authenticated.subject,
        getCredentials: authenticated.getCredentials,
      });
      await attempt;
      finishNavigation();
    } catch (error) {
      handleSignInFailure(error, authenticating);
    }
  }

  return (
    // The artwork is full bleed; the lower native inset boundary keeps account actions clear of system controls.
    <ScrollView
      {...hiddenScrollIndicators}
      style={[styles.screen, { backgroundColor: colors.canvas }]}
    >
      <SignInArtwork />
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.content}>
        <View style={styles.inset}>
          <Text style={[styles.summary, { color: colors.text }]}>
            Les calendriers, les résultats disponibles et vos équipes, au même
            endroit.
          </Text>
        </View>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.parade}
        >
          {[
            "MV",
            "CO",
            "RC",
            "VB",
            "AS",
            "NV",
            "TL",
            "SC",
            "MV",
            "CO",
            "RC",
            "VB",
          ].map((mark, position) => (
            <View
              key={position}
              style={[
                styles.mark,
                {
                  backgroundColor:
                    position % 3 === 0 ? membership.fill : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  tokens.typography.metadata,
                  {
                    color:
                      position % 3 === 0 ? membership.content : colors.text,
                  },
                ]}
              >
                {mark}
              </Text>
            </View>
          ))}
        </View>
        <View style={[styles.inset, styles.actions]}>
          <Button
            label={
              session.status === "initialization-error" ||
              retryRestoration ||
              (session.status === "authenticated" && !session.accountId) ||
              (establishment.status === "error" &&
                !(
                  establishment.error instanceof ApiError &&
                  establishment.error.kind === "cancelled"
                ))
                ? "Réessayer"
                : "Se connecter"
            }
            onPress={() => void signIn()}
            loading={busy}
            fullWidth
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continuer en tant qu’invité"
            onPress={() => void guest.continueAsGuest()}
            disabled={guest.pending}
            accessibilityState={{
              busy: guest.pending,
              disabled: guest.pending,
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
          <PublicAccountLinks supportOrigin={supportOrigin} />
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingVertical: tokens.spacing["2xl"],
    gap: tokens.spacing.lg,
  },
  inset: { paddingHorizontal: tokens.spacing.lg },
  actions: { gap: tokens.spacing.lg },
  summary: tokens.typography.title,
  parade: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    overflow: "hidden",
    height: 42,
  },
  mark: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.control,
    borderWidth: tokens.border.thin,
  },
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
