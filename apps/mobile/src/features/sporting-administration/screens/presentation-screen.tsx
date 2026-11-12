import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Flag } from "lucide-react-native";
import {
  getGetClubLogoQueryKey,
  getGetDivisionLogoQueryKey,
  getGetTeamLogoQueryKey,
} from "../../../../.generated/mobile";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { IconButton } from "../../../shared/components/icon-button";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { PresentationLoading } from "../components/sporting-editor-loading";
import { ScreenState } from "../../../shared/components/screen-state";
import { ReadFeedback } from "../../../shared/components/read-feedback";

import { ErrorState } from "../../../shared/components/state-card";
import { useAdministrationCapabilities } from "../../access/api/use-administration-capabilities";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { useAccountSession } from "../../accounts/current-account";
import { useConsultationQueries } from "../../sporting/api/use-consultation-queries";
import { supportHref } from "../../support";
import { usePresentation, type PresentationTarget } from "../api/presentation";
import { PresentationForm } from "../forms/presentation-form";
import { isSportingReadRefused } from "../api/sporting-administration-queries";

/** Route-owned target; the form reads its own dirty state and F12 supplies current action grants. */
export interface PresentationScreenProps {
  target: PresentationTarget;
}

/** Optional public context never gates the administrative read, mounted draft or ordinary-form keyboard owner. */
export function PresentationScreen({
  target,
}: Readonly<PresentationScreenProps>) {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const client = useQueryClient();
  const router = useRouter();
  const { colors } = useTheme();
  const ordinary = useOrdinaryRequest();
  const consultation = useConsultationQueries();

  /** Selects the exact existing binary cache owner for refresh after a presentation reread. */
  function getLogoKey() {
    if (target.kind === "team") {
      return getGetTeamLogoQueryKey(target.id);
    } else if (target.kind === "club") {
      return getGetClubLogoQueryKey(target.id);
    } else if (target.kind === "division") {
      return getGetDivisionLogoQueryKey(target.id);
    } else {
      return ["presentation-logo-unavailable", target.kind];
    }
  }

  const logoKey = getLogoKey();

  /** Keeps permission to read a division distinct from permission to edit its presentation. */
  function presentationCapabilities() {
    const canManage =
      target.kind === "division-creation"
        ? permissions?.manageDivisionLifecycle === true
        : permissions?.manageSportingPresentation === true;
    const canRead =
      canManage ||
      (target.kind === "division" &&
        permissions?.manageDivisionLifecycle === true);
    return { canManage, canRead };
  }

  const { canManage, canRead } = presentationCapabilities();
  const editing = usePresentation(target, canRead);
  const presentation =
    sessionStatus === "authenticated" ? editing.query.data : undefined;
  const publicContextEnabled =
    ordinary.admitted && canRead && presentation !== undefined;
  const [teamContext, poolContext] = useQueries({
    queries: [
      {
        ...consultation.team(target.id ?? ""),
        enabled: publicContextEnabled && target.kind === "team",
      },
      {
        ...consultation.pool(target.id ?? ""),
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
    } else {
      return undefined;
    }
  }

  const seasonLabel = getSeasonLabel();
  const supportKind =
    target.kind === "team" || target.kind === "club" || target.kind === "pool"
      ? target.kind
      : undefined;
  const pending =
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" && account.isLoading);

  /** Names creation separately from editing the addressed sporting resource. */
  function getTitle() {
    if (target.kind === "division-creation") {
      return "Créer une division";
    } else if (target.kind === "team") {
      return "Modifier l’équipe";
    } else if (target.kind === "club") {
      return "Modifier le club";
    } else if (target.kind === "pool") {
      return "Modifier la poule";
    } else {
      return "Personnaliser la division";
    }
  }

  const title = getTitle();
  const feedback = useActionFeedback();

  /** Refreshes required presentation and its active optional logo; optional artwork failure adds no notice and a local replacement stays untouched. */
  async function refresh() {
    if (editing.save.isPending) {
      return;
    }
    feedback.clear();
    if (!canRead) {
      const result = await account.refetch();
      if (result.isError && presentation) {
        feedback.error();
      }
      return;
    }
    const result = await editing.query.refetch();
    if (result.isError) {
      if (result.data) {
        feedback.error();
      }
      return;
    }
    if (editing.save.isPending) {
      return;
    }
    await client.refetchQueries(
      { queryKey: logoKey, type: "active" },
      { cancelRefetch: false },
    );
  }

  /** Keeps session restoration, account read failure and unavailable grants in their existing feedback states. */
  function getAccessState() {
    if (pending) {
      return <PresentationLoading kind={target.kind} />;
    } else if (
      sessionStatus === "authenticated" &&
      (account.isError || account.isPending)
    ) {
      return (
        <ReadFeedback
          query={account}
          loadingContent={<PresentationLoading kind={target.kind} />}
        />
      );
    } else if (!canRead) {
      return <ErrorState />;
    } else {
      return undefined;
    }
  }

  const accessState = getAccessState();
  const blockingState = !presentation
    ? (accessState ?? (
        <ReadFeedback
          query={editing.query}
          loadingContent={<PresentationLoading kind={target.kind} />}
        />
      ))
    : undefined;
  const FeedbackLayout =
    !presentation && (pending || (!accessState && editing.query.isLoading))
      ? PageContent
      : ScreenState;

  /** Keeps loading feedback separate from the retained, current-session editable form. */
  function renderEditor() {
    return blockingState ? (
      <FeedbackLayout>{blockingState}</FeedbackLayout>
    ) : (
      <PageContent>
        {presentation && (
          <PresentationForm
            key={`${session.subject}:${target.kind}:${target.id}`}
            presentation={presentation}
            target={target}
            editing={editing}
            disabled={!canManage || isSportingReadRefused(editing.query.error)}
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
    );
  }

  return (
    <Page
      header={
        <PageHeader
          title={title}
          action={
            ordinary.admitted && supportKind ? (
              <IconButton
                label="Signaler un problème"
                onPress={() =>
                  router.push(
                    supportHref({
                      screen: supportKind,
                      targetType: supportKind,
                      targetId: target.id,
                    }),
                  )
                }
              >
                <Flag
                  accessible={false}
                  size={tokens.size.icon.lg}
                  color={colors.icon}
                />
              </IconButton>
            ) : undefined
          }
        />
      }
    >
      <FormScrollView
        refreshControl={
          !blockingState &&
          sessionStatus === "authenticated" &&
          target.kind !== "division-creation" ? (
            <DataRefreshControl
              enabled={!editing.save.isPending}
              onRefresh={refresh}
            />
          ) : undefined
        }
      >
        {renderEditor()}
      </FormScrollView>
    </Page>
  );
}
