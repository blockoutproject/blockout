import { Page, PageContent } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { useRouter } from "expo-router";
import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from "@tanstack/react-query";
import { type ReactNode } from "react";
import { FormScrollView } from "../../../shared/components/form-scroll-view";

import { ApiError } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { AdministrationEntry } from "../../access/entry";
import {
  useCurrentAccount,
  useEstablishAccount,
} from "../api/use-current-account";
import { ProfileForm } from "../forms/profile-form";
import { PublicAccountLinks } from "../components/public-account-links";
import { ProfileLoading } from "../components/profile-loading";
import { useAccountSession } from "../session/account-session-provider";
import { useGuestNavigation } from "../hooks/use-guest-navigation";
import { PageHeader } from "../../../shared/components/page-header";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
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
  /** Required route-owned privacy controls; focused consumers may omit with null. */
  privacyEntry: ReactNode;
}

/** Retains confirmed profile content and its draft through a failed background refresh. */
export function ProfileScreen({
  admitted,
  proEntry,
  privacyEntry,
}: ProfileScreenProps) {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const client = useQueryClient();
  const router = useRouter();
  const guest = useGuestNavigation();
  const feedback = useActionFeedback();
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
  const photoRefreshing =
    photoFetching && client.getQueryData(photoKey) !== undefined;

  /** Refreshes the current profile and its displayed photo; disabled draft previews keep their prepared file. */
  async function refresh() {
    if (client.isMutating({ mutationKey })) return;
    feedback.clear();
    const result = await account.refetch({ cancelRefetch: false });
    if (!session.isCurrent(session.generation)) return;
    if (result.isError) {
      if (result.data) feedback.error();
      return;
    }
    if (client.isMutating({ mutationKey }) || !result.data?.hasPhoto) return;
    const currentPhotoKey = getSessionQueryKey(
      session.generation,
      getGetAccountPhotoQueryKey(result.data.accountId),
    );
    await client.refetchQueries({
      queryKey: currentPhotoKey,
      exact: true,
      type: "active",
    });
    const photo = client.getQueryState(currentPhotoKey);
    if (
      session.isCurrent(session.generation) &&
      photo?.status === "error" &&
      photo.dataUpdatedAt > 0
    )
      feedback.error();
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
                  refreshing={account.isRefetching || photoRefreshing}
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
                        {account.isSuccess &&
                          account.data.principalCreatedAt === null && (
                            <AccountAgeRetry
                              key={`age:${session.generation}:${account.data.accountId}`}
                            />
                          )}
                        <ProfileForm
                          key={`${session.generation}:${account.data.accountId}`}
                          account={account.data}
                          disabled={!account.isSuccess}
                          onContinueAsGuest={guest.continueAsGuest}
                          leaving={guest.pending}
                        />
                      </PageContent>
                    )}
                  </>
                )}
                <PageContent>
                  <AdministrationEntry />
                  {!(session.status === "authenticated" && account.data) && (
                    <Button
                      label="Continuer en tant qu’invité"
                      onPress={() => void guest.continueAsGuest()}
                      loading={guest.pending}
                    />
                  )}
                  {proEntry}
                  {privacyEntry}
                  <PublicAccountLinks />
                </PageContent>
              </>
            )}
          </FormScrollView>
        )}
      </ScrollChrome>
    </Page>
  );
}

/** Explicit account-establishment retry for missing age evidence, never part of the profile read gesture. */
function AccountAgeRetry() {
  const session = useAccountSession();
  const establishment = useEstablishAccount();
  const feedback = useActionFeedback();
  return (
    <Button
      label="Réessayer"
      loading={establishment.pending}
      onPress={() => {
        feedback.clear();
        void establishment.start(session)?.catch(() => {
          if (session.isCurrent(session.generation)) feedback.error();
        });
      }}
    />
  );
}
