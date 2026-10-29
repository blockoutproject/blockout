import {
  Page,
  PageContent,
  PageScrollView,
  type PageScrollViewProps,
} from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useState, type ReactNode } from "react";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useProfilePhoto } from "../api/use-profile-editing";
import { StyleSheet, Text, View } from "react-native";
import { ApiError } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
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
import {
  ScrollChrome,
  type ScrollChromeContentProps,
} from "../../../shared/components/scroll-chrome";
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

/** Admits one complete account overview; initial failures and unusable sessions replace its entire body. */
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
  const blockingContent = !admitted ? (
    <ScreenState>
      <ErrorState />
    </ScreenState>
  ) : session.status === "restoring" ||
    session.status === "authenticating" ||
    session.status === "signing-out" ||
    (connected && account.isPending) ? (
    <PageContent>
      <ProfileLoading />
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
              : () => router.push("/sign-in")
        }
      />
    </ScreenState>
  ) : connected &&
    account.isError &&
    (!account.data || isAccessDenied(account.error)) ? (
    <ScreenState>
      <ErrorState
        onRetry={
          missing ? () => router.push("/sign-in") : () => void account.refetch()
        }
        retrying={account.isFetching}
      />
    </ScreenState>
  ) : undefined;
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome
        header={
          <PageHeader title="Mon profil" action={<ProfileSupportAction />} />
        }
      >
        {({ onScroll, headerHeight }) =>
          blockingContent ? (
            <PageScrollView
              onScroll={onScroll}
              scrollEventThrottle={16}
              scrollIndicatorInsets={{ top: headerHeight }}
              contentContainerStyle={{ paddingTop: headerHeight }}
            >
              {blockingContent}
            </PageScrollView>
          ) : (
            <ProfileContent
              key={`${session.generation}:${account.data?.accountId ?? "guest"}`}
              scroll={{ onScroll, headerHeight }}
              refreshControl={
                connected ? (
                  <DataRefreshControl
                    progressViewOffset={headerHeight}
                    enabled={!saving}
                    refreshing={refreshing}
                    onRefresh={() => void refresh()}
                  />
                ) : undefined
              }
              account={connected ? account.data : undefined}
              disabled={!account.isSuccess}
              membershipStatus={membershipStatus}
              onRetryRead={() => void account.refetch()}
              retryingRead={account.isFetching}
              onEdit={() => router.push("/profile/edit")}
              onSignIn={() => router.push("/sign-in")}
            >
              {connected &&
                account.isSuccess &&
                account.data.principalCreatedAt === null && <AccountAgeRetry />}
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
              {connected && (
                <Button
                  label="Supprimer mon compte"
                  variant="secondary"
                  fullWidth
                  disabled
                  onPress={undefined}
                />
              )}
              <Text style={[styles.version, { color: colors.secondaryText }]}>
                Version {Constants.expoConfig?.version}
              </Text>
            </ProfileContent>
          )
        }
      </ScrollChrome>
    </Page>
  );
}

/** Admits content and its native refresh together; later photo failures retain the accepted overview. */
function ProfileContent({
  scroll: { onScroll, headerHeight },
  refreshControl,
  account,
  disabled,
  membershipStatus,
  onEdit,
  onSignIn,
  onRetryRead,
  retryingRead,
  children,
}: {
  scroll: ScrollChromeContentProps;
  refreshControl: PageScrollViewProps["refreshControl"];
  account?: AccountResponse;
  disabled: boolean;
  membershipStatus?: ReactNode;
  onEdit: () => void;
  onSignIn: () => void;
  onRetryRead: () => void;
  retryingRead: boolean;
  children: ReactNode;
}) {
  const photo = useProfilePhoto(
    account?.accountId ?? "",
    !!account?.hasPhoto && !disabled,
  );
  const available = !account?.hasPhoto || !!photo.data;
  const [admitted, setAdmitted] = useState(available);
  if (!admitted && available) setAdmitted(true);
  return (
    <PageScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      scrollIndicatorInsets={{ top: headerHeight }}
      contentContainerStyle={{ paddingTop: headerHeight }}
      refreshControl={admitted || available ? refreshControl : undefined}
    >
      {!admitted && !available ? (
        photo.isError || disabled ? (
          <ScreenState>
            <ErrorState
              onRetry={disabled ? onRetryRead : () => void photo.refetch()}
              retrying={retryingRead || photo.isFetching}
            />
          </ScreenState>
        ) : (
          <PageContent>
            <ProfileLoading />
          </PageContent>
        )
      ) : (
        <PageContent>
          {account ? (
            <ProfileIdentity
              account={account}
              disabled={disabled}
              photo={photo}
              membershipStatus={membershipStatus}
              onEdit={onEdit}
            />
          ) : (
            <ProfileSignIn onSignIn={onSignIn} />
          )}
          {children}
        </PageContent>
      )}
    </PageScrollView>
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
  version: { ...tokens.typography.metadata, textAlign: "center" },
});
