import { Page, PageContent } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";
import { ScreenState } from "@/shared/components/screen-state";
import { useNavigation } from "expo-router";
import { StackActions } from "expo-router/react-navigation";
import { FormScrollView } from "@/shared/components/form-scroll-view";

import { useCurrentAccount } from "../api/use-current-account";
import { ProfileForm } from "../forms/profile-form";
import { AccountRecovery } from "../components/account-recovery";
import { ProfileLoading } from "../components/profile-loading";
import { accountSessionRecovery } from "../session/account-session-recovery";
import { useAccountSession } from "../session/account-session-provider";
import { PageHeader } from "@/shared/components/page-header";

import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { useProfileRefresh } from "../api/use-profile-refresh";
import { ProfileSupportAction } from "../components/profile-support-action";
import { useContextualSignIn } from "../hooks/use-contextual-sign-in";
import { SignInInvitationCard } from "../components/sign-in-invitation";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";

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
  const navigation = useNavigation();
  const { saving, refresh } = useProfileRefresh(account);

  /** Returns this stack to its overview, including an unanchored warm link or a save acknowledged on another tab. */
  function close() {
    navigation.dispatch(StackActions.popTo("index"));
  }

  const recovery = accountSessionRecovery(session);
  const signIn = useContextualSignIn(admitted);

  /** Recovery never mounts an editor before the current account and session are usable. */
  function readFeedback() {
    if (!admitted) {
      return (
        <ScreenState>
          <ErrorState />
        </ScreenState>
      );
    }
    if (signIn.visible) {
      return (
        <ScreenState>
          <SignInInvitationCard
            message="Connectez-vous pour modifier votre profil."
            onSignIn={signIn.start}
            loading={signIn.pending}
          />
        </ScreenState>
      );
    }
    if (
      recovery.pending ||
      (session.status === "authenticated" &&
        account.isPending &&
        account.isFetching &&
        !hasReadError(account))
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
          <AccountRecovery error={account.error}>
            <ErrorState onRetry={recovery.onRetry} />
          </AccountRecovery>
        </ScreenState>
      );
    }
    if (
      session.status === "authenticated" &&
      (account.isPending || hasReadError(account))
    ) {
      return (
        <ScreenState>
          <AccountRecovery error={account.error}>
            <ReadFeedback query={account} loadingContent={null} />
          </AccountRecovery>
        </ScreenState>
      );
    }
    return null;
  }

  let content;
  if (
    admitted &&
    !signIn.visible &&
    session.status === "authenticated" &&
    account.data
  ) {
    content = (
      <ProfileForm
        key={`${session.subject}:${account.data.accountId}`}
        refreshControl={
          <DataRefreshControl
            enabled={!saving && !hasReadError(account)}
            fetching={account.isFetching}
            onRefresh={refresh}
          />
        }
        account={account.data}
        disabled={!account.isSuccess}
        readFeedback={readFeedback()}
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
          onBack={close}
          action={<ProfileSupportAction />}
        />
      }
    >
      {content}
    </Page>
  );
}
