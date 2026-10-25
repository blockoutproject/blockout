import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import {
  useClassification,
  useDivisions,
  type ClassificationTarget,
} from "../api/classification";
import { EditorPage, SportingAccessFeedback } from "../components/editor-page";
import { ClassificationForm } from "../forms/classification-form";
/** Route-owned original scope and unsaved navigation notification. */
export interface ClassificationScreenProps {
  target: ClassificationTarget;
  onDirtyChange?: (dirty: boolean) => void;
}
/** Composes F05/F12 admission, generated reads and the retained correction form. */
export function ClassificationScreen({
  target,
  onDirtyChange,
}: ClassificationScreenProps) {
  const editing = useClassification(target);
  const divisions = useDivisions();
  const { authority } = editing;
  const current =
    authority.sessionStatus === "authenticated"
      ? editing.query.data
      : undefined;
  return (
    <EditorPage
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
          onDirtyChange={onDirtyChange}
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
