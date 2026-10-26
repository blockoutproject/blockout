import { isAccessDenied } from "../../../shared/api/access-denied";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import {
  getGetClubLogoQueryKey,
  getGetTeamLogoQueryKey,
  getGetDivisionLogoQueryKey,
} from "../../../../.generated/mobile";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import {
  AccessDenied,
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { useAccountSession } from "../../accounts/current-account";
import { useAdministrationCapabilities } from "../../access/api/use-administration-capabilities";
import { usePresentation, type PresentationTarget } from "../api/presentation";
import { PresentationForm } from "../forms/presentation-form";
import { EditorPage } from "../components/editor-page";

/** Route-owned target; the form reads its own dirty state and F12 supplies current action grants. */
export interface PresentationScreenProps {
  target: PresentationTarget;
}
/** Composes the approved editor using the platform's existing ordinary-form keyboard mechanism. */
export function PresentationScreen({ target }: PresentationScreenProps) {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const client = useQueryClient();
  const logoKey = getSessionQueryKey(
    session.generation,
    target.kind === "team"
      ? getGetTeamLogoQueryKey(target.id)
      : target.kind === "club"
        ? getGetClubLogoQueryKey(target.id)
        : target.kind === "division"
          ? getGetDivisionLogoQueryKey(target.id)
          : ["presentation-logo-unavailable", target.kind],
  );
  const logoRefreshing =
    useIsFetching({
      queryKey: logoKey,
      predicate: ({ state }) => state.data !== undefined,
    }) > 0;
  const canManage =
    target.kind === "division-creation"
      ? permissions?.manageDivisionLifecycle === true
      : permissions?.manageSportingPresentation === true;
  const canRead =
    canManage ||
    (target.kind === "division" &&
      permissions?.manageDivisionLifecycle === true);
  const editing = usePresentation(target, canRead);
  const presentation =
    sessionStatus === "authenticated" ? editing.query.data : undefined;
  const pending =
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" && account.isPending);
  const title =
    target.kind === "division-creation"
      ? "Créer une division"
      : target.kind === "team"
        ? "Modifier l’équipe"
        : target.kind === "club"
          ? "Modifier le club"
          : target.kind === "pool"
            ? "Modifier la poule"
            : "Personnaliser la division";
  const feedback = useActionFeedback();
  /** Native refresh rereads current presentation and only its mounted remote logo; a prepared local replacement stays untouched. */
  async function refresh() {
    if (editing.save.isPending()) return;
    feedback.clear();
    if (!canRead) {
      await account.refetch();
      return;
    }
    const result = await editing.query.refetch();
    if (!session.isCurrent(session.generation)) return;
    if (result.isError) {
      if (result.data && !isAccessDenied(result.error)) feedback.error();
      return;
    }
    if (editing.save.isPending()) return;
    await client.refetchQueries(
      { queryKey: logoKey, type: "active" },
      { cancelRefetch: false },
    );
    if (!session.isCurrent(session.generation)) return;
    const retainedFailure = client
      .getQueryCache()
      .findAll({ queryKey: logoKey, type: "active" })
      .some(
        ({ state }) =>
          state.status === "error" &&
          state.data &&
          !isAccessDenied(state.error),
      );
    if (retainedFailure)
      feedback.error(
        "L’actualisation du logo a échoué. Le logo précédent reste affiché.",
      );
  }
  const accessState = pending ? (
    <RequestLoading />
  ) : isAccessDenied(account.error) ? (
    <AccessDenied />
  ) : account.isError ? (
    <RequestError
      message="Les permissions du compte sont indisponibles."
      onRetry={() =>
        void account.refetch().then((result) => {
          if (result.isError && result.data && !isAccessDenied(result.error))
            feedback.error();
        })
      }
      retrying={account.isFetching}
    />
  ) : !canRead ? (
    <AccessDenied message="Cette action nécessite une permission dédiée." />
  ) : undefined;
  const denied = isAccessDenied(editing.query.error);
  return (
    <EditorPage
      state={
        !presentation
          ? (accessState ??
            (denied ? (
              <AccessDenied />
            ) : editing.query.isError ? (
              <RequestError
                message="La présentation est indisponible."
                onRetry={() =>
                  void editing.query.refetch().then((result) => {
                    if (
                      result.isError &&
                      result.data &&
                      !isAccessDenied(result.error)
                    )
                      feedback.error();
                  })
                }
                retrying={editing.query.isFetching}
              />
            ) : (
              <RequestLoading />
            )))
          : undefined
      }
      title={title}
      refreshControl={
        sessionStatus === "authenticated" &&
        target.kind !== "division-creation" ? (
          <DataRefreshControl
            enabled={!editing.save.pending}
            refreshing={
              editing.query.isRefetching ||
              account.isRefetching ||
              logoRefreshing
            }
            onRefresh={() => void refresh()}
          />
        ) : undefined
      }
    >
      {accessState}
      {presentation && denied && <AccessDenied />}
      {presentation && (
        <PresentationForm
          key={`${session.generation}:${target.kind}:${target.id}`}
          presentation={presentation}
          target={target}
          editing={editing}
          disabled={!canManage || editing.query.isError}
        />
      )}
    </EditorPage>
  );
}
