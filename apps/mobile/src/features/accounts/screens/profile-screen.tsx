import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, Text } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
} from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { AdministrationEntry } from "../../access/entry";
import { ProEntry } from "../../pro/entry";
import {
  useCurrentAccount,
  useEstablishAccount,
} from "../api/use-current-account";
import { ProfileForm } from "../components/profile-form";
import { PublicAccountLinks } from "../components/public-account-links";
import { useAccountSession } from "../session/account-session-provider";

/** Current ordinary admission; identification reads do not grant profile navigation. */
export interface ProfileScreenProps {
  admitted: boolean;
  /** Route-owned F09 feedback keeps this ordinary profile independent of the native billing SDK. */
  proFeedback?: ReactNode;
}

/** Each platform uses its accepted single keyboard mechanism for this ordinary bounded form. */
const ProfileScrollView =
  Platform.OS === "ios" ? ScrollView : KeyboardAwareScrollView;

/** Current owner profile with an isolated editable draft; admission remains controlled by F12. */
export function ProfileScreen(props: ProfileScreenProps) {
  return Platform.OS === "android" ? (
    <KeyboardProvider>
      <ProfileContent {...props} />
    </KeyboardProvider>
  ) : (
    <ProfileContent {...props} />
  );
}

/** Retains confirmed profile content and its draft through a failed background refresh. */
function ProfileContent({ admitted, proFeedback }: ProfileScreenProps) {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const router = useRouter();
  const { colors } = useTheme();
  const [guestError, setGuestError] = useState(false);
  const missing =
    account.error instanceof ApiError && account.error.status === 404;

  /** Invalidates private state and clears native credentials before announcing guest navigation. */
  async function continueAsGuest() {
    if (session.status === "signing-out") return;
    setGuestError(false);
    try {
      await session.clearCredentials();
      router.replace("/");
    } catch {
      setGuestError(true);
    }
  }
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ProfileScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {!admitted ? (
          <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
        ) : (
          <>
            <Text
              accessibilityRole="header"
              style={[tokens.typography.heading, { color: colors.text }]}
            >
              Modifier mon profil
            </Text>
            {session.status === "restoring" ||
            (session.status === "authenticated" && account.isPending) ? (
              <RequestLoading />
            ) : session.status !== "authenticated" ? (
              <Button
                label="Se connecter"
                onPress={() => router.replace("/sign-in")}
              />
            ) : (
              <>
                {account.isError && (
                  <RequestError
                    message={
                      missing
                        ? "Votre compte Blockout est introuvable."
                        : "Votre profil Blockout est indisponible."
                    }
                    onRetry={() => void account.refetch()}
                    retrying={account.isFetching}
                  />
                )}
                {missing && (
                  <Button
                    label="Se connecter"
                    onPress={() => router.replace("/sign-in")}
                  />
                )}
                {account.data && (
                  <>
                    {account.data.principalCreatedAt === null && (
                      <AccountAgeRetry
                        key={`age:${session.generation}:${account.data.accountId}`}
                      />
                    )}
                    <ProfileForm
                      key={`${session.generation}:${account.data.accountId}`}
                      account={account.data}
                    />
                  </>
                )}
              </>
            )}
            <AdministrationEntry />
            {guestError && (
              <RequestError message="La déconnexion locale a échoué. Réessayez." />
            )}
            <Button
              label="Continuer en tant qu’invité"
              onPress={() => void continueAsGuest()}
              loading={session.status === "signing-out"}
            />
            <ProEntry onOpenPresentation={() => router.push("/pro")} />
            {proFeedback}
            <PublicAccountLinks />
          </>
        )}
      </ProfileScrollView>
    </SafeAreaView>
  );
}

/** Explicit missing-evidence read; its pending/error state belongs only to this account generation. */
function AccountAgeRetry() {
  const session = useAccountSession();
  const establishment = useEstablishAccount();
  return (
    <>
      <RequestError
        message={
          establishment.isError
            ? "La lecture de l’ancienneté a échoué. Réessayez."
            : "L’ancienneté de votre compte est indisponible. Seules les actions qui en dépendent restent en attente."
        }
      />
      <Button
        label="Réessayer la lecture de l’ancienneté"
        loading={establishment.isPending}
        onPress={() => {
          if (!establishment.isPending) establishment.mutate(session);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.lg },
});
