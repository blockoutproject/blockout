import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useAccountSession } from "../../accounts/current-account";
import { useAdministrationCapabilities } from "../../access/api/use-administration-capabilities";
import { usePresentation, type PresentationTarget } from "../api/presentation";
import { PresentationForm } from "../forms/presentation-form";
import { EditorPage } from "../components/editor-page";

/** Route-owned target and unsaved navigation guard; action grants are read from the current F12 account. */
export interface PresentationScreenProps {
  target: PresentationTarget;
  onDirtyChange?: (dirty: boolean) => void;
}
/** Composes the approved editor using the platform's existing ordinary-form keyboard mechanism. */
export function PresentationScreen({
  target,
  onDirtyChange,
}: PresentationScreenProps) {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const canManage =
    target.kind === "division-creation"
      ? permissions?.manageDivisionLifecycle === true
      : permissions?.manageSportingPresentation === true;
  const editing = usePresentation(target, canManage);
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
            : "Modifier la division";
  return (
    <EditorPage title={title}>
      {pending ? (
        <RequestLoading />
      ) : account.isError ? (
        <RequestError
          message="Les permissions du compte sont indisponibles."
          onRetry={() => void account.refetch()}
          retrying={account.isFetching}
        />
      ) : !canManage ? (
        <RequestError message="Cette action nécessite une permission dédiée." />
      ) : null}
      {presentation ? (
        <PresentationForm
          key={`${session.generation}:${target.kind}:${target.id}`}
          presentation={presentation}
          target={target}
          editing={editing}
          disabled={!canManage}
          onDirtyChange={onDirtyChange}
        />
      ) : (
        canManage &&
        (editing.query.isError ? (
          <RequestError
            message="La présentation est indisponible."
            onRetry={() => void editing.query.refetch()}
            retrying={editing.query.isFetching}
          />
        ) : (
          <RequestLoading />
        ))
      )}
    </EditorPage>
  );
}
