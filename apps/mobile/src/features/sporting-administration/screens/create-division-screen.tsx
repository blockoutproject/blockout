import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { useAccountSession } from "@/features/accounts/current-account";
import { Button } from "@/shared/components/button";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { hasReadError } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { useCreateDivision } from "../api/use-create-division";
import { PresentationLoading } from "../components/sporting-editor-loading";
import { PresentationForm } from "../forms/presentation-form";
import { newDivisionValues } from "../forms/presentation-values";
import { usePresentationDraft } from "../forms/use-presentation-draft";
import type { PresentationValues } from "../schemas/presentation-schema";

/** Keeps the creation draft within the original principal and business account. */
export function CreateDivisionScreen() {
  const { subject, accountId } = useAccountSession();
  return <CreateDivisionForm key={`${subject}:${accountId}`} />;
}

/** Owns local defaults, lifecycle admission and the terminal view of the accepted creation. */
function CreateDivisionForm() {
  const router = useRouter();
  const { authority, save, hasCurrentGrant } = useCreateDivision();
  const { account, sessionStatus, enabled } = authority;
  const editor = usePresentationDraft(undefined, newDivisionValues);
  const accepted = editor.state.baseline;
  const blocked =
    sessionStatus !== "authenticated" ||
    !enabled ||
    account.isPending ||
    hasReadError(account);
  const FeedbackLayout = isAccessLoading({ sessionStatus, account })
    ? PageContent
    : ScreenState;

  /** A refused or abandoned visit cannot consume a delayed write result. */
  async function submit(values: PresentationValues) {
    const data = await save.mutateAsync(values);
    if (hasCurrentGrant()) {
      return { kind: "division" as const, data };
    }
    return undefined;
  }

  return (
    <Page header={<PageHeader title="Créer une division" />}>
      <FormScrollView>
        {blocked && (
          <FeedbackLayout>
            <AccessFeedback
              sessionStatus={sessionStatus}
              account={account}
              enabled={enabled}
              loadingContent={<PresentationLoading kind="division" />}
            />
          </FeedbackLayout>
        )}
        <PageContent
          style={blocked ? styles.hidden : undefined}
          accessibilityElementsHidden={blocked}
          importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
        >
          <PresentationForm
            kind="division"
            logoTarget={
              accepted?.kind === "division" && accepted.data.logo.effectiveUrl
                ? { kind: "division", id: accepted.data.id }
                : undefined
            }
            editor={editor}
            disabled={blocked}
            locked={accepted !== undefined}
            saving={save.isPending}
            onSave={submit}
            beforeSave={
              accepted && (
                <Button
                  label="Voir les divisions"
                  variant="secondary"
                  onPress={() => router.replace("/administration/divisions")}
                />
              )
            }
          />
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
