import { Page, PageContent } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { useNavigation, useRouter } from "expo-router";
import { LogIn } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { FormScrollView } from "../../../shared/components/form-scroll-view";

import { isAccountMissing } from "../api/current-account-query";
import { Button } from "../../../shared/components/button";
import { useCurrentAccount } from "../api/use-current-account";
import { ProfileForm } from "../forms/profile-form";
import { ProfileLoading } from "../components/profile-loading";
import { accountSessionRecovery } from "../session/account-session-recovery";
import { useAccountSession } from "../session/account-session-provider";
import { PageHeader } from "../../../shared/components/page-header";

import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { useProfileRefresh } from "../api/use-profile-refresh";
import { ProfileSupportAction } from "../components/profile-support-action";

/** Ordinary admission gates editing independently from identity-only account reads. */
export interface ProfileEditScreenProps {
  admitted: boolean;
}

/** Separate editor retains its original account draft through read failures and ordinary save errors. */
export function ProfileEditScreen({
  admitted,
}: Readonly<ProfileEditScreenProps>) {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const router = useRouter();
  const navigation = useNavigation();
  const { saving, refresh } = useProfileRefresh(account, true);
  const missing = isAccountMissing(account.error);

  /** Pops only the profile stack, including a save acknowledged while another tab is active. The route anchors direct entries. */
  function close() {
    navigation.goBack();
  }

  const recovery = accountSessionRecovery(session);

  /** Recovery never mounts an editor before the current account and session are usable. */
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
      (session.status === "authenticated" && account.isPending)
    ) {
      return (
        <PageContent>
          <ProfileLoading editor />
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
                onPress={() => router.replace("/sign-in")}
              />
            )}
          </ErrorState>
        </ScreenState>
      );
    }
    if (session.status !== "authenticated") {
      return (
        <ScreenState style={styles.centered}>
          <Button
            label="Se connecter"
            fullWidth
            onPress={() => router.replace("/sign-in")}
          />
        </ScreenState>
      );
    }
    if (account.isError) {
      return (
        <ScreenState>
          <ErrorState
            onRetry={missing ? undefined : () => void account.refetch()}
            retrying={account.isFetching}
          >
            {missing && (
              <Button
                label="Se connecter"
                leadingIcon={LogIn}
                onPress={() => router.replace("/sign-in")}
              />
            )}
          </ErrorState>
        </ScreenState>
      );
    }
    return null;
  }

  let content;
  if (admitted && session.status === "authenticated" && account.data) {
    content = (
      <ProfileForm
        key={`${session.subject}:${account.data.accountId}`}
        refreshControl={
          <DataRefreshControl enabled={!saving} onRefresh={refresh} />
        }
        account={account.data}
        disabled={!account.isSuccess}
        onCancel={close}
        onSaved={close}
      />
    );
  } else {
    content = <FormScrollView>{readFeedback()}</FormScrollView>;
  }
  return (
    <Page
      header={
        <PageHeader
          title="Modifier mon profil"
          action={<ProfileSupportAction />}
        />
      }
    >
      {content}
    </Page>
  );
}

const styles = StyleSheet.create({ centered: { justifyContent: "center" } });
