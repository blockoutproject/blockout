import { Page, PageContent } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { useNavigation, useRouter } from "expo-router";
import { FormScrollView } from "../../../shared/components/form-scroll-view";

import { ApiError } from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { useCurrentAccount } from "../api/use-current-account";
import { ProfileForm } from "../forms/profile-form";
import { ProfileLoading } from "../components/profile-loading";
import { useAccountSession } from "../session/account-session-provider";
import { PageHeader } from "../../../shared/components/page-header";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { useProfileRefresh } from "../api/use-profile-refresh";

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
  const { saving, refreshing, refresh } = useProfileRefresh(account);
  const missing =
    account.error instanceof ApiError && account.error.status === 404;

  /** Pops only the profile stack, including a save acknowledged while another tab is active. The route anchors direct entries. */
  function close() {
    navigation.goBack();
  }

  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title="Modifier mon profil" />}>
        {({ onScroll, headerHeight }) => (
          <FormScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              admitted && session.status === "authenticated" ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  enabled={!saving}
                  refreshing={refreshing}
                  onRefresh={() => void refresh()}
                />
              ) : undefined
            }
          >
            {!admitted ? (
              <ScreenState>
                <ErrorState />
              </ScreenState>
            ) : (
              <>
                {session.status === "restoring" ? (
                  <ScreenState>
                    <RequestLoading />
                  </ScreenState>
                ) : session.status === "authenticated" && account.isPending ? (
                  <PageContent>
                    <ProfileLoading />
                  </PageContent>
                ) : session.status !== "authenticated" ? (
                  <ScreenState>
                    <Button
                      label="Se connecter"
                      fullWidth
                      onPress={() => router.replace("/sign-in")}
                    />
                  </ScreenState>
                ) : (
                  <>
                    {account.isError && !account.data && (
                      <ScreenState>
                        <ErrorState
                          onRetry={() => void account.refetch()}
                          retrying={account.isFetching}
                        />
                        {missing && (
                          <Button
                            label="Se connecter"
                            fullWidth
                            onPress={() => router.replace("/sign-in")}
                          />
                        )}
                      </ScreenState>
                    )}
                    {account.data && (
                      <PageContent>
                        <ProfileForm
                          key={`${session.generation}:${account.data.accountId}`}
                          account={account.data}
                          disabled={!account.isSuccess}
                          onCancel={close}
                          onSaved={close}
                        />
                      </PageContent>
                    )}
                  </>
                )}
              </>
            )}
          </FormScrollView>
        )}
      </ScrollChrome>
    </Page>
  );
}
