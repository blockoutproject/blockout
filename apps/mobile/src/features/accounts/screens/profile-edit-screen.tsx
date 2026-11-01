import { Page, PageContent } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { useNavigation, useRouter } from "expo-router";
import { FormScrollView } from "../../../shared/components/form-scroll-view";

import { ApiError } from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import { useCurrentAccount } from "../api/use-current-account";
import { ProfileForm } from "../forms/profile-form";
import { ProfileLoading } from "../components/profile-loading";
import { useAccountSession } from "../session/account-session-provider";
import { PageHeader } from "../../../shared/components/page-header";

import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { useProfileRefresh } from "../api/use-profile-refresh";
import { ProfileSupportAction } from "../components/profile-support-action";

/** Ordinary admission gates editing independently from identity-only account reads. */
export interface ProfileEditScreenProps {
  admitted: boolean;
}

/** Separate editor retains its original account draft through read failures and uncertain saves. */
export function ProfileEditScreen({ admitted }: ProfileEditScreenProps) {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const router = useRouter();
  const navigation = useNavigation();
  const { saving, refreshing, refresh } = useProfileRefresh(account, true);
  const missing =
    account.error instanceof ApiError && account.error.status === 404;

  /** Pops only the profile stack, including a save acknowledged while another tab is active. The route anchors direct entries. */
  function close() {
    navigation.goBack();
  }

  return (
    <Page>
      <PageHeader
        title="Modifier mon profil"
        action={<ProfileSupportAction />}
      />
      {admitted && session.status === "authenticated" && account.data ? (
        <ProfileForm
          key={`${session.subject}:${account.data.accountId}`}
          refreshControl={
            <DataRefreshControl
              enabled={!saving}
              refreshing={refreshing}
              onRefresh={() => void refresh()}
            />
          }
          account={account.data}
          disabled={!account.isSuccess}
          onRetryRead={() => void account.refetch()}
          retryingRead={account.isFetching}
          onCancel={close}
          onSaved={close}
        />
      ) : (
        <FormScrollView>
          {!admitted ? (
            <ScreenState>
              <ErrorState />
            </ScreenState>
          ) : session.status === "restoring" ||
            session.status === "authenticating" ||
            session.status === "signing-out" ||
            (session.status === "authenticated" && account.isPending) ? (
            <PageContent>
              <ProfileLoading editor />
            </PageContent>
          ) : session.status === "initialization-error" ||
            session.status === "authentication-error" ||
            session.status === "reauthentication-required" ? (
            <ScreenState>
              <ErrorState
                onRetry={
                  session.status === "initialization-error"
                    ? session.retryInitialization
                    : session.status === "authentication-error"
                      ? session.retryAuthentication
                      : () => router.replace("/sign-in")
                }
              />
            </ScreenState>
          ) : session.status !== "authenticated" ? (
            <ScreenState>
              <Button
                label="Se connecter"
                fullWidth
                onPress={() => router.replace("/sign-in")}
              />
            </ScreenState>
          ) : account.isError ? (
            <ScreenState>
              <ErrorState
                onRetry={
                  missing
                    ? () => router.replace("/sign-in")
                    : () => void account.refetch()
                }
                retrying={account.isFetching}
              />
            </ScreenState>
          ) : null}
        </FormScrollView>
      )}
    </Page>
  );
}
