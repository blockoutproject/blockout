import { useRouter } from "expo-router";
import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from "@tanstack/react-query";
import { type ReactNode } from "react";
import { StyleSheet } from "react-native";
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
import { ProfileForm } from "../forms/profile-form";
import { PublicAccountLinks } from "../components/public-account-links";
import { useAccountSession } from "../session/account-session-provider";
import { useGuestNavigation } from "../hooks/use-guest-navigation";
import { PageHeader } from "../../../shared/components/page-header";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import {
  getChangeAccountProfileMutationKey,
  getGetAccountPhotoQueryKey,
} from "../../../../.generated/mobile";
import { getSessionQueryKey } from "../../../shared/query/query-client";

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
  const client = useQueryClient();
  const router = useRouter();
  const { colors } = useTheme();
  const guest = useGuestNavigation();
  const mutationKey = getSessionQueryKey(
    session.generation,
    getChangeAccountProfileMutationKey(),
  );
  const saving = useIsMutating({ mutationKey }) > 0;
  const missing =
    account.error instanceof ApiError && account.error.status === 404;
  const photoKey = getSessionQueryKey(
    session.generation,
    getGetAccountPhotoQueryKey(account.data?.accountId ?? ""),
  );
  const photoFetching = useIsFetching({ queryKey: photoKey, exact: true }) > 0;

  /** Refreshes the current profile and its displayed photo; disabled draft previews keep their prepared file. */
  async function refresh() {
    if (client.isMutating({ mutationKey })) return;
    const result = await account.refetch({ cancelRefetch: false });
    if (
      !session.isCurrent(session.generation) ||
      client.isMutating({ mutationKey }) ||
      !result.data?.hasPhoto
    )
      return;
    await client.refetchQueries({
      queryKey: getSessionQueryKey(
        session.generation,
        getGetAccountPhotoQueryKey(result.data.accountId),
      ),
      exact: true,
      type: "active",
    });
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PageHeader title="Modifier mon profil" />
      <FormScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          admitted && session.status === "authenticated" ? (
            <DataRefreshControl
              enabled={!saving}
              refreshing={account.isFetching || photoFetching}
              onRefresh={() => void refresh()}
            />
          ) : undefined
        }
      >
        {!admitted ? (
          <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
        ) : (
          <>
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
                      onContinueAsGuest={guest.continueAsGuest}
                      leaving={guest.pending}
                    />
                  </>
                )}
              </>
            )}
            <AdministrationEntry />
            {!(session.status === "authenticated" && account.data) && (
              <Button
                label="Continuer en tant qu’invité"
                onPress={() => void guest.continueAsGuest()}
                loading={guest.pending}
              />
            )}
            {proEntry}
            <PublicAccountLinks />
          </>
        )}
      </FormScrollView>
    </SafeAreaView>
  );
}

/** Explicit account-establishment retry for missing age evidence, never part of the profile read gesture. */
function AccountAgeRetry() {
  const session = useAccountSession();
  const establishment = useEstablishAccount();
  const feedback = useActionFeedback();
  return (
    <RequestError
      message="L’ancienneté de votre compte est indisponible."
      retrying={establishment.pending}
      onRetry={() => {
        feedback.clear();
        void establishment.start(session)?.catch(() => {
          if (session.isCurrent(session.generation)) feedback.error();
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.lg },
});
