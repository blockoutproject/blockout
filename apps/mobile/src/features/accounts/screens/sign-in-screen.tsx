import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebAuthError, WebAuthErrorCodes } from "react-native-auth0";
import { ApiError } from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useEstablishAccount } from "../api/use-current-account";
import { PublicAccountLinks } from "../components/public-account-links";
import { SignInArtwork } from "../components/sign-in-artwork";
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
      <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
    </SafeAreaView>
  );
}

/** Owns one admitted login attempt; late native completion cannot restart a discarded journey. */
function SignInJourney() {
  const router = useRouter();
  const session = useAccountSession();
  const { colors, membership } = useTheme();
  const establishment = useEstablishAccount();
  const { mutate } = establishment;
  const [loginSucceeded, setLoginSucceeded] = useState(false);
  const loginStarted = useRef(false);
  const [loginError, setLoginError] = useState<string>();
  const busy =
    session.status === "authenticating" ||
    session.status === "signing-out" ||
    loginSucceeded ||
    establishment.isPending ||
    session.status === "restoring";

  /** Uses the current committed SDK/session context after an explicitly completed login only. */
  useEffect(() => {
    if (
      !loginSucceeded ||
      loginStarted.current ||
      session.status !== "authenticated"
    )
      return;
    loginStarted.current = true;
    mutate(session, {
      onSettled: () => {
        loginStarted.current = false;
        setLoginSucceeded(false);
      },
      onSuccess: () => {
        if (session.isCurrent(session.generation)) router.replace("/profile");
      },
    });
  }, [loginSucceeded, session, mutate, router]);

  /** Starts either hosted authentication or a targeted retry using still-valid SDK credentials. */
  async function signIn() {
    if (busy) return;
    setLoginError(undefined);
    if (session.status === "authenticated") {
      mutate(session, {
        onSuccess: () => {
          if (session.isCurrent(session.generation)) router.replace("/profile");
        },
      });
      return;
    }
    const audience = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE;
    if (!audience) {
      setLoginError("La connexion est indisponible. Réessayez.");
      return;
    }
    try {
      await session.signIn(audience);
      setLoginSucceeded(true);
    } catch (error) {
      let message = "La connexion est indisponible. Réessayez.";
      if (error instanceof WebAuthError) {
        if (error.type === WebAuthErrorCodes.USER_CANCELLED)
          message = "Connexion annulée.";
        else if (error.type === WebAuthErrorCodes.ACCESS_DENIED)
          message = "Connexion refusée.";
      }
      setLoginError(message);
    }
  }

  /** Leaves the sole credential/session owner before entering guest navigation. */
  async function continueAsGuest() {
    if (session.status === "signing-out") return;
    try {
      await session.clearCredentials();
      router.replace("/");
    } catch {
      setLoginError("La déconnexion locale a échoué. Réessayez.");
    }
  }

  const missingEmail =
    establishment.error instanceof ApiError &&
    establishment.error.problem?.type ===
      "urn:blockout:problem:provider-email-unavailable";
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <SignInArtwork />
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.content}>
        <Text style={[styles.summary, { color: colors.text }]}>
          Les calendriers, les résultats disponibles et vos équipes, au même
          endroit.
        </Text>
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
        {loginError && <RequestError message={loginError} />}
        {establishment.isError &&
          !(
            establishment.error instanceof ApiError &&
            establishment.error.kind === "cancelled"
          ) && (
            <RequestError
              message={
                missingEmail
                  ? "Votre profil attend une adresse e-mail disponible auprès du fournisseur."
                  : "Votre identité est connectée, mais votre profil Blockout est indisponible."
              }
              onRetry={() => void signIn()}
              retrying={busy}
            />
          )}
        {session.status === "initialization-error" ? (
          <RequestError
            message="La préparation de la connexion a échoué."
            onRetry={session.retryInitialization}
          />
        ) : (
          <Button
            label="Se connecter"
            onPress={() => void signIn()}
            loading={busy}
            fullWidth
          />
        )}
        {session.status === "authentication-error" && !loginError && (
          <RequestError
            message="La restauration de la connexion a échoué."
            onRetry={session.retryAuthentication}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continuer en tant qu’invité"
          onPress={() => void continueAsGuest()}
          disabled={session.status === "signing-out"}
          accessibilityState={{
            busy: session.status === "signing-out",
            disabled: session.status === "signing-out",
          }}
          style={[
            styles.guest,
            { backgroundColor: colors.subtle, borderColor: colors.border },
          ]}
        >
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            Continuer en tant qu’invité
          </Text>
        </Pressable>
        <PublicAccountLinks />
      </SafeAreaView>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: tokens.spacing.lg,
    paddingVertical: tokens.spacing.section,
    gap: tokens.spacing.lg,
  },
  summary: { ...tokens.typography.strong, fontSize: 18, lineHeight: 24 },
  parade: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    overflow: "hidden",
    marginHorizontal: -tokens.spacing.lg,
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
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.control,
  },
});
