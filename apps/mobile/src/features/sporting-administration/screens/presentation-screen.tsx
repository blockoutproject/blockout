import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Flag } from "lucide-react-native";
import {
  getGetClubLogoQueryKey,
  getGetDivisionLogoQueryKey,
  getGetTeamLogoQueryKey,
} from "../../../../.generated/mobile";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { IconButton } from "@/shared/components/icon-button";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { PresentationLoading } from "../components/sporting-editor-loading";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { StyleSheet } from "react-native";

import { AccessFeedback } from "@/features/access/components/access-feedback";
import { useAdministrationCapabilities } from "@/features/access/api/use-administration-capabilities";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import { useAccountSession } from "@/features/accounts/current-account";
import { useConsultationQueries } from "@/features/sporting/api/use-consultation-queries";
import { supportHref } from "@/features/support";
import {
  usePresentation,
  type Presentation,
  type PresentationTarget,
} from "../api/presentation";
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
  const presentation: Presentation | null | undefined =
    sessionStatus !== "authenticated"
      ? undefined
      : target.kind === "division-creation"
        ? canRead
          ? { kind: "division-creation" }
          : undefined
        : editing.query.data;
  const editor = usePresentationDraft(presentation);
  const baseline = editor.state.baseline;
  const publicContextEnabled =
    ordinary.admitted && canRead && presentation != null;
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
    if (result.isError) {
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

  const requiredRead =
    account.isPending ||
    hasReadError(account) ||
    target.kind === "division-creation"
      ? account
      : editing.query;
  const blocked =
    sessionStatus !== "authenticated" ||
    !canRead ||
    requiredRead.isPending ||
    hasReadError(requiredRead);
  const initialLoading =
    sessionStatus === "restoring" ||
    (!hasReadError(requiredRead) && requiredRead.isLoading);
  const FeedbackLayout = initialLoading ? PageContent : ScreenState;

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
          target.kind !== "division-creation" ? (
            <DataRefreshControl
              enabled={
                !blocked &&
                sessionStatus === "authenticated" &&
                !editing.save.isPending
              }
              fetching={editing.query.isFetching}
              onRefresh={refresh}
            />
          ) : undefined
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
              presentation={presentation ?? baseline}
              target={target}
              editing={editing}
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
