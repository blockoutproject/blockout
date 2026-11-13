import {
  Page,
  PageContent,
  PageScrollView,
  type PageScrollViewProps,
} from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";
import { ScreenState } from "@/shared/components/screen-state";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { LogIn, SquarePen } from "lucide-react-native";
import { IconButton } from "@/shared/components/icon-button";
import type { ReactNode } from "react";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { useProfilePhoto } from "../api/use-profile-editing";
import { StyleSheet, Text, View } from "react-native";
import { isAccountMissing } from "../api/current-account-query";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { AdministrationEntry } from "@/features/access/entry";
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
import { accountSessionRecovery } from "../session/account-session-recovery";
import { useAccountSession } from "../session/account-session-provider";
import { PageHeader } from "@/shared/components/page-header";

import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";

/** Ordinary account overview; route-owned account controls and membership retain their independent authorities. */
export interface ProfileScreenProps {
  admitted: boolean;
  proEntry: ReactNode;
  privacyEntry: ReactNode;
  membershipStatus?: ReactNode;
}

/** Admits the authorized account overview independently of its optional photo; account/session failures own whole-page recovery. */
export function ProfileScreen({
  admitted,
  proEntry,
  privacyEntry,
  membershipStatus,
}: Readonly<ProfileScreenProps>) {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const router = useRouter();
  const feedback = useActionFeedback();

  /** Uses SDK browser logout; cancellation preserves the signed-in account and safe retry feedback. */
  async function signOut() {
    feedback.clear();
    try {
      await session.signOut();
      router.replace("/");
    } catch {
      feedback.error();
    }
  }

  const { colors } = useTheme();
  const { saving, refresh } = useProfileRefresh(account);
  const connected = session.status === "authenticated";
  const missing = isAccountMissing(account.error);
  const recovery = accountSessionRecovery(session);

  /** Keeps whole-page account/session recovery separate from an already admitted profile. */
  function readFeedback() {
    if (!admitted) {
      return (
        <ScreenState>
          <ErrorState />
        </ScreenState>
      );
    }
    if (
      recovery.pending ||
      (connected &&
        account.isPending &&
        account.isFetching &&
        !hasReadError(account))
    ) {
      return (
        <PageContent>
          <ProfileLoading />
        </PageContent>
      );
    }
    if (recovery.failed) {
      return (
        <ScreenState>
          <ErrorState onRetry={recovery.onRetry}>
            {session.status === "reauthentication-required" && (
              <Button
                label="Se connecter"
                leadingIcon={LogIn}
                onPress={() => router.push("/sign-in")}
              />
            )}
          </ErrorState>
        </ScreenState>
      );
    }
    if (connected && (account.isPending || hasReadError(account))) {
      return (
        <ScreenState>
          {missing ? (
            <ErrorState>
              <Button
                label="Se connecter"
                leadingIcon={LogIn}
                onPress={() => router.push("/sign-in")}
              />
            </ErrorState>
          ) : (
            <ReadFeedback query={account} loadingContent={null} />
          )}
        </ScreenState>
      );
    }
    return undefined;
  }

  const blockingContent = readFeedback();
  if (blockingContent) {
    return (
      <Page
        header={
          <ProfileHeader
            onEdit={
              admitted && connected && account.data
                ? () => router.push("/profile/edit")
                : undefined
            }
          />
        }
      >
        <PageScrollView>{blockingContent}</PageScrollView>
      </Page>
    );
  }
  return (
    <ProfileContent
      key={`${session.subject}:${account.data?.accountId ?? "guest"}`}
      refreshControl={
        connected ? (
          <DataRefreshControl
            enabled={!saving}
            fetching={account.isFetching}
            onRefresh={refresh}
          />
        ) : undefined
      }
      account={connected ? (account.data ?? undefined) : undefined}
      disabled={!account.isSuccess}
      membershipStatus={membershipStatus}
      onEdit={() => router.push("/profile/edit")}
      onSignIn={() => router.push("/sign-in")}
    >
      {connected &&
        account.isSuccess &&
        account.data &&
        account.data.principalCreatedAt === null && <AccountAgeRetry />}
      <AdministrationEntry />
      <View style={styles.group}>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.label, { color: colors.secondaryText }]}
        >
          Informations légales
        </Text>
        <ProfileLegalLinks />
      </View>
      <View style={styles.group}>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.label, { color: colors.secondaryText }]}
        >
          Mon compte
        </Text>
        {proEntry}
        {privacyEntry}
      </View>
      {connected && (
        <View style={styles.actions}>
          <Button
            label="Se déconnecter"
            variant="secondary"
            fullWidth
            onPress={() => void signOut()}
            loading={session.operation === "signing-out"}
          />
          <Button
            label="Supprimer mon compte"
            variant="secondary"
            fullWidth
            disabled={!account.isSuccess}
            onPress={() => router.push("/profile/erase")}
          />
        </View>
      )}
      <Text style={[styles.version, { color: colors.secondaryText }]}>
        Version {Constants.expoConfig?.version}
      </Text>
    </ProfileContent>
  );
}

/** Keeps known account content and native refresh usable while its independent photo read loads or fails. */
function ProfileContent({
  refreshControl,
  account,
  disabled,
  membershipStatus,
  onEdit,
  onSignIn,
  children,
}: Readonly<{
  refreshControl: PageScrollViewProps["refreshControl"];
  account?: AccountResponse;
  disabled: boolean;
  membershipStatus?: ReactNode;
  onEdit: () => void;
  onSignIn: () => void;
  children: ReactNode;
}>) {
  const photo = useProfilePhoto(
    account?.accountId ?? "",
    !!account?.hasPhoto && !disabled,
  );
  return (
    <Page
      header={
        <ProfileHeader
          onEdit={account ? onEdit : undefined}
          disabled={disabled}
        />
      }
    >
      <PageScrollView refreshControl={refreshControl}>
        <PageContent>
          {account ? (
            <ProfileIdentity
              account={account}
              photo={photo}
              membershipStatus={membershipStatus}
            />
          ) : (
            <ProfileSignIn onSignIn={onSignIn} />
          )}
          {children}
        </PageContent>
      </PageScrollView>
    </Page>
  );
}

/** Shared profile chrome keeps authorized account editing beside support, independently of optional media readiness. */
function ProfileHeader({
  onEdit,
  disabled = false,
}: Readonly<{
  onEdit?: () => void;
  disabled?: boolean;
}>) {
  const { colors } = useTheme();
  return (
    <PageHeader
      title="Mon profil"
      action={
        <>
          {onEdit && (
            <IconButton
              label="Modifier mon profil"
              onPress={onEdit}
              disabled={disabled}
            >
              <SquarePen
                accessible={false}
                size={tokens.size.icon.lg}
                color={colors.icon}
              />
            </IconButton>
          )}
          <ProfileSupportAction />
        </>
      }
    />
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
      loading={establishment.isPending}
      onPress={() => {
        feedback.clear();
        if (!session.subject) {
          return;
        }
        void establishment
          .mutateAsync({
            subject: session.subject,
            getCredentials: session.getCredentials,
          })
          ?.catch(() => feedback.error());
      }}
    />
  );
}

const styles = StyleSheet.create({
  actions: { gap: tokens.layout.actions.gap },
  group: { gap: tokens.spacing.md },
  version: { ...tokens.typography.metadata, textAlign: "center" },
});
