import { useQueries, useQueryClient } from "@tanstack/react-query";
import { presentationLogoKey } from "../api/presentation-logo-query";
import { useActionConfirmation } from "@/shared/forms/use-action-confirmation";
import type { useActionFeedback } from "@/shared/components/action-feedback";
import type { ImageSelection } from "@/shared/images/use-image-selection";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { useDivisionActivity } from "../api/classification";
import { DivisionActivityAction } from "../components/division-activity-action";
import { PresentationLoading } from "../components/sporting-editor-loading";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { StyleSheet } from "react-native";

import { AccessFeedback } from "@/features/access/components/access-feedback";
import { useAdministrationCapabilities } from "@/features/access/api/use-administration-capabilities";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import { useAccountSession } from "@/features/accounts/current-account";
import { useConsultationQueries } from "@/features/sporting/api/use-consultation-queries";
import { SupportFlagAction } from "@/features/support";
import {
  usePresentation,
  type Presentation,
  type PresentationTarget,
} from "../api/presentation";
import { presentationValues } from "../forms/presentation-values";
import { PresentationForm } from "../forms/presentation-form";
import { usePresentationDraft } from "../forms/use-presentation-draft";

/** Route-owned target; the form reads its own dirty state and F12 supplies current action grants. */
export interface PresentationScreenProps {
  target: PresentationTarget;
}

/** Optional public context never gates the administrative read, mounted draft or ordinary-form keyboard owner. */
export function PresentationScreen({
  target,
}: Readonly<PresentationScreenProps>) {
  const session = useAccountSession();
  return (
    <PresentationScreenContent
      key={`${session.subject}:${session.accountId}:${target.kind}:${target.id}`}
      target={target}
    />
  );
}

/** Keeps the mounted draft within its original session and target through read refusal. */
function PresentationScreenContent({
  target,
}: Readonly<PresentationScreenProps>) {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const client = useQueryClient();
  const ordinary = useOrdinaryRequest();
  const consultation = useConsultationQueries();

  const canManage = permissions?.manageSportingPresentation === true;
  const canRead =
    canManage ||
    (target.kind === "division" &&
      permissions?.manageDivisionLifecycle === true);
  const editing = usePresentation(target, canRead);
  const presentation =
    sessionStatus === "authenticated" ? editing.query.data : undefined;
  const activity = useDivisionActivity(target.id);
  const confirmAction = useActionConfirmation();
  const editor = usePresentationDraft(presentation);
  const baseline = editor.state.baseline;
  const publicContextEnabled =
    ordinary.admitted && canRead && presentation != null;
  const [teamContext, poolContext] = useQueries({
    queries: [
      {
        ...consultation.team(target.id),
        enabled: publicContextEnabled && target.kind === "team",
      },
      {
        ...consultation.pool(target.id),
        enabled: publicContextEnabled && target.kind === "pool",
      },
    ],
  });

  /** Uses optional public season context only after successful admission and its own read. */
  function getSeasonLabel() {
    if (!publicContextEnabled) {
      return undefined;
    } else if (target.kind === "team" && !teamContext.isError) {
      return teamContext.data?.team.season.label;
    } else if (target.kind === "pool" && !poolContext.isError) {
      return poolContext.data?.pool.season.label;
    }
    return undefined;
  }

  const seasonLabel = getSeasonLabel();
  const supportKind =
    target.kind === "team" || target.kind === "club" || target.kind === "pool"
      ? target.kind
      : undefined;

  /** Names the addressed sporting resource. */
  function getTitle() {
    if (target.kind === "team") {
      return "Modifier l’équipe";
    } else if (target.kind === "club") {
      return "Modifier le club";
    } else if (target.kind === "pool") {
      return "Modifier la poule";
    }
    return "Personnaliser la division";
  }

  const title = getTitle();

  /** Refreshes required presentation and its active optional logo; optional artwork failure adds no notice and a local replacement stays untouched. */
  async function refresh() {
    if (editing.save.isPending) {
      return;
    }
    if (!canRead) {
      await account.refetch();
      return;
    }
    const result = await editing.query.refetch();
    if (result.isError || editing.save.isPending || target.kind === "pool") {
      return;
    }
    await client.refetchQueries(
      { queryKey: presentationLogoKey(target.kind, target.id), type: "active" },
      { cancelRefetch: false },
    );
  }

  const requiredRead =
    account.isPending || hasReadError(account) ? account : editing.query;
  const blocked =
    sessionStatus !== "authenticated" ||
    !canRead ||
    requiredRead.isPending ||
    hasReadError(requiredRead);
  const initialLoading =
    sessionStatus === "restoring" ||
    (!hasReadError(requiredRead) && requiredRead.isLoading);
  const FeedbackLayout = initialLoading ? PageContent : ScreenState;

  /** Keeps the original division's independent command after the presentation save. */
  function renderActivity(
    imageSelection: ImageSelection,
    feedback: ReturnType<typeof useActionFeedback>,
  ) {
    if (
      baseline?.kind !== "division" ||
      activity.authority.permissions?.manageDivisionLifecycle !== true
    ) {
      return undefined;
    }
    const division = baseline.data;

    /** Confirms the independent activity change without consuming edits to the presentation. */
    async function changeActivity() {
      if (
        imageSelection.isPending() ||
        editing.save.isPending ||
        activity.save.isPending ||
        editing.query.data === null ||
        !activity.authority.enabled
      ) {
        return;
      }
      const confirmed = await confirmAction({
        title: `${division.active ? "Désactiver" : "Réactiver"} la division ?`,
        message: division.active
          ? "Les poules, équipes et matchs seront masqués sans effacer leur historique. La collecte s’arrêtera selon ses règles habituelles."
          : "Seule l’inactivité sera levée. Les autres restrictions de visibilité et de collecte restent applicables.",
        confirmLabel: division.active ? "Désactiver" : "Réactiver",
      });
      if (!confirmed || imageSelection.isPending()) {
        return;
      }
      try {
        const attempt = activity.save.mutateAsync({ active: !division.active });
        editor.update({ ...editor.state, feedback: undefined });
        feedback.clear();
        const response = await attempt;
        const accepted: Presentation = { kind: "division", data: response };
        editor.update({
          baseline: accepted,
          feedback: response.active
            ? "Division réactivée. Les autres restrictions restent applicables."
            : "Division désactivée. L’historique est conservé.",
        });
        editor.reset(presentationValues(accepted), true);
      } catch {
        feedback.error();
      }
    }

    return (
      <DivisionActivityAction
        division={division}
        executing={activity.save.isPending}
        disabled={
          imageSelection.pending ||
          editing.save.isPending ||
          editing.query.data === null
        }
        onPress={() => void changeActivity()}
      />
    );
  }

  return (
    <Page
      header={
        <PageHeader
          title={title}
          action={
            ordinary.admitted && supportKind ? (
              <SupportFlagAction
                origin={{
                  screen: supportKind,
                  targetType: supportKind,
                  targetId: target.id,
                }}
              />
            ) : undefined
          }
        />
      }
    >
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            enabled={!blocked && !editing.save.isPending}
            fetching={editing.query.isFetching}
            onRefresh={refresh}
          />
        }
      >
        {blocked && (
          <FeedbackLayout>
            {!canRead || sessionStatus !== "authenticated" ? (
              <AccessFeedback
                sessionStatus={sessionStatus}
                account={account}
                enabled={canRead}
                loadingContent={<PresentationLoading kind={target.kind} />}
              />
            ) : (
              <ReadFeedback
                query={requiredRead}
                loadingContent={<PresentationLoading kind={target.kind} />}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent
          style={blocked ? styles.hidden : undefined}
          accessibilityElementsHidden={blocked}
          importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
        >
          {baseline && (
            <PresentationForm
              kind={target.kind}
              logoTarget={editing.query.data === null ? undefined : target}
              onSave={editing.save.mutateAsync}
              saving={editing.save.isPending}
              activityPending={activity.save.isPending}
              afterSave={renderActivity}
              editor={editor}
              disabled={blocked || !canManage || editing.query.data === null}
              seasonLabel={seasonLabel}
              professionalTeam={
                publicContextEnabled &&
                target.kind === "team" &&
                !teamContext.isError
                  ? teamContext.data?.team.professional
                  : undefined
              }
            />
          )}
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
