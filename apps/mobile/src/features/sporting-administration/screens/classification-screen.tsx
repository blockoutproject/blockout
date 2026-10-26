import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import {
  AccessDenied,
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import {
  useClassification,
  useDivisions,
  type ClassificationTarget,
} from "../api/classification";
import { EditorPage, SportingAccessFeedback } from "../components/editor-page";
import { ClassificationForm } from "../forms/classification-form";
/** Original route scope; the form owns unsaved-change prevention. */
export interface ClassificationScreenProps {
  target: ClassificationTarget;
}
/** Composes F05/F12 admission, generated reads and the retained correction form. */
export function ClassificationScreen({ target }: ClassificationScreenProps) {
  const editing = useClassification(target);
  const divisions = useDivisions();
  const { authority } = editing;
  const current =
    authority.sessionStatus === "authenticated"
      ? editing.query.data
      : undefined;
  const feedback = useActionFeedback();
  const denied = isAccessDenied(editing.query.error);
  return (
    <EditorPage
      state={
        !current ? (
          !authority.enabled ? (
            <SportingAccessFeedback authority={authority} />
          ) : denied ? (
            <AccessDenied />
          ) : editing.query.isError ? (
            <RequestError
              message="La classification est indisponible."
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
          )
        ) : undefined
      }
      refreshControl={
        authority.sessionStatus === "authenticated" ? (
          <DataRefreshControl
            enabled={!editing.save.pending}
            refreshing={
              editing.query.isRefetching ||
              divisions.query.isRefetching ||
              authority.account.isRefetching
            }
            onRefresh={() => {
              if (editing.save.isPending()) return;
              if (!authority.enabled) {
                void authority.account.refetch().then((result) => {
                  if (
                    result.isError &&
                    result.data &&
                    !isAccessDenied(result.error)
                  )
                    feedback.error();
                });
                return;
              }
              void editing.query.refetch().then((result) => {
                if (
                  result.isError &&
                  result.data &&
                  !isAccessDenied(result.error)
                )
                  feedback.error();
              });
              void divisions.query.refetch().then((result) => {
                if (
                  result.isError &&
                  result.data &&
                  !isAccessDenied(result.error)
                )
                  feedback.error();
              });
            }}
          />
        ) : undefined
      }
      title={
        target.kind === "pack"
          ? "Classification du pack"
          : "Classification de la poule"
      }
    >
      <SportingAccessFeedback authority={authority} />
      {denied && <AccessDenied />}
      {current && (
        <ClassificationForm
          key={`${authority.session.generation}:${target.kind}:${target.id}`}
          target={target}
          current={current}
          editing={editing}
          divisions={divisions}
        />
      )}
    </EditorPage>
  );
}
