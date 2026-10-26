import { useRouter } from "expo-router";
import { type ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { AdministrationEntry } from "../../access/entry";
import {
  useCurrentAccount,
  useEstablishAccount,
} from "../api/use-current-account";
import { ProfileForm } from "../components/profile-form";
import { PublicAccountLinks } from "../components/public-account-links";
import { useAccountSession } from "../session/account-session-provider";
import { useGuestNavigation } from "../hooks/use-guest-navigation";

/** Current ordinary admission; identification reads do not grant profile navigation. */
export interface ProfileScreenProps {
  admitted: boolean;
  /** Required route-owned F09 composition; focused consumers may explicitly omit it with null. */
  proEntry: ReactNode;
}

/** Retains confirmed profile content and its draft through a failed background refresh. */
export function ProfileScreen({ admitted, proEntry }: ProfileScreenProps) {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const router = useRouter();
  const { colors } = useTheme();
  const guest = useGuestNavigation();
  const missing =
    account.error instanceof ApiError && account.error.status === 404;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <FormScrollView contentContainerStyle={styles.content}>
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
            <Button
              label="Continuer en tant qu’invité"
              onPress={() => void guest.continueAsGuest()}
              loading={guest.pending}
            />
            {proEntry}
            <PublicAccountLinks />
          </>
        )}
      </FormScrollView>
    </SafeAreaView>
  );
}

/** Explicit evidence-refresh command; pending/error belongs only to this account generation. */
function AccountAgeRetry() {
  const session = useAccountSession();
  const establishment = useEstablishAccount();
  const feedback = useActionFeedback();
  return (
    <>
      <RequestError message="L’ancienneté de votre compte est indisponible." />
      <Button
        label="Réessayer la lecture de l’ancienneté"
        loading={establishment.pending}
        onPress={() => {
          feedback.clear();
          void establishment.start(session)?.catch(() => {
            if (session.isCurrent(session.generation)) feedback.error();
          });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.lg },
});
