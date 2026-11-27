import { Page } from "@/shared/components/page";
import { ScreenState } from "@/shared/components/screen-state";
import { useNavigation, useRouter } from "expo-router";
import { StackActions } from "expo-router/react-navigation";
import { FormScrollView } from "@/shared/components/form-scroll-view";

import { useCurrentAccount } from "../api/use-current-account";
import { ProfileForm } from "../forms/profile-form";
import { ProfileLoading } from "../components/profile-loading";
import { profileReadFeedback } from "../components/profile-read-feedback";
import { useAccountSession } from "../session/account-session-provider";
import { PageHeader } from "@/shared/components/page-header";

import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { useProfileRefresh } from "../api/use-profile-refresh";
import { ProfileSupportAction } from "../components/profile-support-action";
import { SignInInvitationCard } from "../components/sign-in-invitation";
import { hasReadError } from "@/shared/components/read-feedback";

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
  const { saving, refresh } = useProfileRefresh(account);

  /** Returns this stack to its overview, including an unanchored warm link or a save acknowledged on another tab. */
  function close() {
    navigation.dispatch(StackActions.popTo("index"));
  }

  const blockingContent = profileReadFeedback({
    admitted,
    session,
    account,
    loadingContent: <ProfileLoading editor />,
  });

  let content;
  if (admitted && session.status === "authenticated" && account.data) {
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
        readFeedback={blockingContent}
        onCancel={close}
        onSaved={close}
      />
    );
  } else {
    content = (
      <FormScrollView>
        {blockingContent ??
          (session.status === "guest" && (
            <ScreenState>
              <SignInInvitationCard
                message="Connectez-vous pour modifier votre profil."
                onSignIn={() => router.replace("/sign-in")}
              />
            </ScreenState>
          ))}
      </FormScrollView>
    );
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
