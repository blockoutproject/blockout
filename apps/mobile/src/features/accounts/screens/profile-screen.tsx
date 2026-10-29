import {
  Page,
  PageContent,
  PageScrollView,
} from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ApiError } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { AdministrationEntry } from "../../access/entry";
import {
  useCurrentAccount,
  useEstablishAccount,
} from "../api/use-current-account";
import { useProfileRefresh } from "../api/use-profile-refresh";
import { ProfileLegalLinks } from "../components/public-account-links";
import { ProfileLoading } from "../components/profile-loading";
import { ProfileIdentity } from "../components/profile-identity";
import { ProfileSignIn } from "../components/profile-sign-in";
import { ProfileSupportAction } from "../components/profile-support-action";
import { useAccountSession } from "../session/account-session-provider";
import { useGuestNavigation } from "../hooks/use-guest-navigation";
import { PageHeader } from "../../../shared/components/page-header";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Ordinary account overview; route-owned account controls and membership retain their independent authorities. */
export interface ProfileScreenProps {
  admitted: boolean;
  proEntry: ReactNode;
  privacyEntry: ReactNode;
  membershipStatus?: ReactNode;
}

/** Shows accepted identity separately from editing, keeping independent navigation usable after a profile read failure. */
export function ProfileScreen({
  admitted,
  proEntry,
  privacyEntry,
  membershipStatus,
}: ProfileScreenProps) {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const router = useRouter();
  const guest = useGuestNavigation();
  const { colors } = useTheme();
  const { saving, refreshing, refresh } = useProfileRefresh(account);
  const connected = session.status === "authenticated";
  const missing =
    account.error instanceof ApiError && account.error.status === 404;
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome
        header={
          <PageHeader title="Mon profil" action={<ProfileSupportAction />} />
        }
      >
        {({ onScroll, headerHeight }) => (
          <PageScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              admitted && connected ? (
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
              <PageContent>
                {session.status === "restoring" ? (
                  <RequestLoading />
                ) : connected && account.isPending ? (
                  <ProfileLoading />
                ) : !connected ? (
                  <ProfileSignIn onSignIn={() => router.push("/sign-in")} />
                ) : (
                  <>
                    {account.isError && !account.data && (
                      <View style={styles.feedback}>
                        <ErrorState
                          onRetry={() => void account.refetch()}
                          retrying={account.isFetching}
                        />
                        {missing && (
                          <Button
                            label="Se connecter"
                            fullWidth
                            onPress={() => router.push("/sign-in")}
                          />
                        )}
                      </View>
                    )}
                    {account.data && (
                      <>
                        <ProfileIdentity
                          key={`${session.generation}:${account.data.accountId}`}
                          account={account.data}
                          disabled={!account.isSuccess}
                          membershipStatus={membershipStatus}
                          onEdit={() => router.push("/profile/edit")}
                        />
                        {account.isSuccess &&
                          account.data.principalCreatedAt === null && (
                            <AccountAgeRetry
                              key={`age:${session.generation}:${account.data.accountId}`}
                            />
                          )}
                      </>
                    )}
                  </>
                )}
                <AdministrationEntry />
                <View style={styles.group}>
                  <Text
                    accessibilityRole="header"
                    style={[
                      tokens.typography.label,
                      { color: colors.secondaryText },
                    ]}
                  >
                    Informations légales
                  </Text>
                  <ProfileLegalLinks />
                </View>
                <View style={styles.group}>
                  <Text
                    accessibilityRole="header"
                    style={[
                      tokens.typography.label,
                      { color: colors.secondaryText },
                    ]}
                  >
                    Mon compte
                  </Text>
                  {proEntry}
                  {privacyEntry}
                </View>
                {connected && (
                  <Button
                    label="Se déconnecter"
                    variant="secondary"
                    fullWidth
                    onPress={() => void guest.continueAsGuest()}
                    loading={guest.pending}
                  />
                )}
                <Text style={[styles.version, { color: colors.secondaryText }]}>
                  Version {Constants.expoConfig?.version}
                </Text>
              </PageContent>
            )}
          </PageScrollView>
        )}
      </ScrollChrome>
    </Page>
  );
}

/** Explicit establishment retry for missing provider age evidence; ordinary account refresh cannot issue this command. */
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

const styles = StyleSheet.create({
  group: { gap: tokens.spacing.md },
  feedback: { gap: tokens.spacing.lg },
  version: { ...tokens.typography.metadata, textAlign: "center" },
});
