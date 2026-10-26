import {
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
  return (
    <EditorPage
      refreshControl={
        authority.sessionStatus === "authenticated" ? (
          <DataRefreshControl
            enabled={!editing.save.pending}
            refreshing={
              editing.query.isFetching ||
              divisions.query.isFetching ||
              authority.account.isFetching
            }
            onRefresh={() => {
              if (editing.save.isPending()) return;
              if (!authority.enabled) {
                void authority.account.refetch();
                return;
              }
              void editing.query.refetch();
              void divisions.query.refetch();
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
      {current ? (
        <ClassificationForm
          key={`${authority.session.generation}:${target.kind}:${target.id}`}
          target={target}
          current={current}
          editing={editing}
          divisions={divisions}
        />
      ) : (
        authority.enabled &&
        (editing.query.isError ? (
          <RequestError
            message="La classification est indisponible."
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
