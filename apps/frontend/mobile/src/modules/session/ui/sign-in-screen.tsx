import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  product,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import {
  useSessionActions,
  useSessionState,
} from "@/src/modules/session/providers/session-context";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import { Pill } from "@/src/shared/ui/pill";
import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";
import { Action } from "@/src/shared/ui/action";
import { ApiError } from "@/src/shared/api/api-error";

/** Returns safe user-facing copy for an authentication boundary failure. */
export const getSignInErrorMessage = (err: unknown): string => {
  if (err instanceof ApiError) {
    if (err.status === 0 || err.status >= 500) {
      return "Le serveur rencontre un problème, réessaie dans quelques instants.";
    }
    if (err.message && err.message.trim().length > 0) {
      return err.message;
    }
    return "Erreur lors de la connexion.";
  }
  return "Connexion impossible, réessaie.";
};

/** Renders the canonical native entry screen without changing the Auth0 flow. */
const SignInScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { signIn, continueAsGuest } = useSessionActions();
  const { isLoading, error } = useSessionState();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGuesting, setIsGuesting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !isSigningIn &&
      error &&
      !["NO_CREDENTIALS", "USER_CANCELLED"].includes(error.name)
    ) {
      const msg = getSignInErrorMessage(error);
      setApiError(msg);
    }
  }, [error, isSigningIn]);

  const onPressLogin = async () => {
    try {
      setIsSigningIn(true);
      setApiError(null);
      await signIn();
    } catch {
      setApiError("Connexion impossible, réessaie.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const onPressGuest = async () => {
    try {
      setIsGuesting(true);
      setApiError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      continueAsGuest();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setApiError("Impossible de continuer en invité.");
    } finally {
      setIsGuesting(false);
    }
  };

  const isBusy = isSigningIn || isGuesting || isLoading;

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.background }]}
      testID="session-sign-in-screen"
    >
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <MaskedImage
            fallback={require("@/assets/images/blockout-logo-dark.png")}
            size={36}
            radius={radius.sm}
            shadow
          />
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {product.name}
          </Text>
        </View>

        <Text style={[styles.tagline, { color: theme.textSecondary }]}>
          Ton appli pour suivre le volley : scores en direct, classements et
          équipes.
        </Text>

        <View style={styles.pillsRow}>
          <Pill
            label="Scores"
            leftIcon="flash"
            size="md"
            backgroundColor={theme.surface}
            borderColor={theme.border}
          />
          <Pill
            label="Classements"
            leftIcon="trophy"
            size="md"
            backgroundColor={theme.surface}
            borderColor={theme.border}
          />
          <Pill
            label="Suivi équipes"
            leftIcon="bell-outline"
            size="md"
            backgroundColor={theme.surface}
            borderColor={theme.border}
          />
        </View>

        <View style={styles.ctaRow}>
          <Action
            onPress={onPressLogin}
            loading={isSigningIn || isLoading}
            disabled={isBusy}
            label="Se connecter"
            loadingLabel="Connexion…"
            leftIcon={
              <MaterialCommunityIcons
                name="account"
                size={18}
                color={theme.onPrimary}
              />
            }
            style={styles.ctaButton}
            testID="session-sign-in-action"
          />

          <Pressable
            onPress={onPressGuest}
            style={styles.guestButton}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Continuer en tant qu’invité"
            accessibilityState={{ disabled: isBusy, busy: isGuesting }}
            testID="session-guest-action"
          >
            {isGuesting ? (
              <ActivityIndicator color={theme.textSecondary} />
            ) : (
              <Text style={[styles.guestText, { color: theme.textSecondary }]}>
                Continuer en tant qu’invité
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={[styles.legal, { color: theme.textInactive }]}>
          En continuant, tu acceptes nos CGU et notre politique de
          confidentialité.
        </Text>
      </View>

      <ApiErrorToast
        message={apiError}
        bottomOffset={insets.bottom}
        onHidden={() => setApiError(null)}
      />
    </View>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[6],
    justifyContent: "center",
    gap: spacing[4],
  },
  brandRow: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    ...typography.hero,
  },
  tagline: {
    ...typography.bodyStrong,
    textAlign: "center",
  },
  pillsRow: {
    flexDirection: "row",
    alignSelf: "center",
    gap: spacing[2],
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: "100%",
  },
  ctaRow: {
    alignItems: "center",
    gap: spacing[2],
  },
  ctaButton: {
    width: "80%",
  },
  guestButton: {
    minHeight: 44,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    alignItems: "center",
    justifyContent: "center",
  },
  guestText: {
    ...typography.compactStrong,
  },
  legal: {
    ...typography.metadata,
    textAlign: "center",
    marginTop: spacing.optical,
  },
});
