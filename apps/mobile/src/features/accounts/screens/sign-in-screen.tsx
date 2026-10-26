import { ErrorState } from "../../../shared/components/state-card";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebAuthError, WebAuthErrorCodes } from "react-native-auth0";
import { ApiError } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { LoadingIndicator } from "../../../shared/components/loading-indicator";

import { ScreenState } from "../../../shared/components/screen-state";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useEstablishAccount } from "../api/use-current-account";
import { PublicAccountLinks } from "../components/public-account-links";
import { SignInArtwork } from "../components/sign-in-artwork";
import { useGuestNavigation } from "../hooks/use-guest-navigation";
import { useAccountSession } from "../session/account-session-provider";

/** Current ordinary admission supplied by F12; real gate composition belongs to F12 T028. */
export interface SignInScreenProps {
  admitted: boolean;
}

/** Keeps login intent scoped to admitted navigation; blocking access discards the local journey. */
export function SignInScreen({ admitted }: SignInScreenProps) {
  const { colors } = useTheme();
  return admitted ? (
    <SignInJourney />
  ) : (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.stateContent}>
        <ScreenState>
          <ErrorState />
        </ScreenState>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Owns one admitted login attempt; late native completion cannot restart a discarded journey. */
function SignInJourney() {
  const router = useRouter();
  const session = useAccountSession();
  const { colors, membership } = useTheme();
  const establishment = useEstablishAccount();
  const feedback = useActionFeedback();
  const guest = useGuestNavigation();
  const mounted = useRef(false);
  // This journey owns explicit login feedback; the SDK still owns the resulting session error.
  const [loginAttempted, setLoginAttempted] = useState(false);
  const busy =
    session.status === "authenticating" ||
    session.status === "signing-out" ||
    establishment.pending ||
    session.status === "restoring";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Starts either hosted authentication or a targeted retry using still-valid SDK credentials. */
  async function signIn() {
    if (busy || session.getSnapshot().operation) return;
    feedback.clear();
    const audience = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE;
    if (session.status !== "authenticated" && !audience) {
      feedback.error();
      return;
    }
    let generation = session.generation;
    let authenticating = session.status !== "authenticated";
    try {
      let authenticated;
      if (session.status === "authenticated") authenticated = session;
      else {
        setLoginAttempted(true);
        const login = session.signIn(audience ?? "");
        generation = session.getSnapshot().generation;
        authenticated = await login;
      }
      if (!authenticated || !mounted.current || !session.isCurrent(generation))
        return;
      authenticating = false;
      const attempt = establishment.start(authenticated);
      if (!attempt) return;
      await attempt;
      if (mounted.current && session.isCurrent(generation))
        router.replace("/profile");
    } catch (error) {
      if (!mounted.current || !session.isCurrent(generation)) return;
      if (!authenticating) {
        feedback.error(undefined, generation);
        return;
      }
      let message: string | undefined;
      if (error instanceof WebAuthError) {
        if (error.type === WebAuthErrorCodes.USER_CANCELLED)
          message = "Connexion annulée.";
      }
      feedback.error(message, generation);
    }
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.canvas }]}>
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
          {session.status === "initialization-error" ? (
            <ErrorState onRetry={session.retryInitialization} />
          ) : (
            <Button
              label={
                establishment.status === "error" &&
                !(
                  establishment.error instanceof ApiError &&
                  establishment.error.kind === "cancelled"
                )
                  ? "Réessayer"
                  : "Se connecter"
              }
              onPress={() => void signIn()}
              loading={busy}
              fullWidth
            />
          )}
          {session.status === "authentication-error" && !loginAttempted && (
            <ErrorState onRetry={session.retryAuthentication} />
          )}
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
          <PublicAccountLinks />
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  stateContent: { flexGrow: 1, padding: tokens.spacing.lg },
  content: {
    paddingVertical: tokens.spacing.section,
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
    borderWidth: tokens.borderWidth,
  },
  guest: {
    minHeight: tokens.size.control,
    padding: tokens.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: tokens.spacing.sm,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.control,
  },
  guestLabel: {
    ...tokens.typography.strong,
    flexShrink: 1,
    textAlign: "center",
  },
});
