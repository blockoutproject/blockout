import { useWatch } from "react-hook-form";
import { StyleSheet } from "react-native";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { ClassificationLoading } from "../components/sporting-editor-loading";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import {
  useClassification,
  useDivisions,
  type ClassificationTarget,
} from "../api/classification";
import { ClassificationForm } from "../forms/classification-form";
import { useClassificationDraft } from "../forms/use-classification-draft";

/** Original route scope; the form owns unsaved-change prevention. */
export interface ClassificationScreenProps {
  target: ClassificationTarget;
}

/** Keys the RHF visit to its original principal, business account and target. */
export function ClassificationScreen({
  target,
}: Readonly<ClassificationScreenProps>) {
  const editing = useClassification(target);
  const { session } = editing.authority;
  const visitKey = `${session.subject}:${session.accountId}:${target.kind}:${target.id}`;
  return (
    <ClassificationVisit key={visitKey} target={target} editing={editing} />
  );
}

/** The catalogue participates only while this mounted draft consumes custom choices. */
function ClassificationVisit({
  target,
  editing,
}: Readonly<
  ClassificationScreenProps & {
    editing: ReturnType<typeof useClassification>;
  }
>) {
  const { authority } = editing;
  const current =
    authority.sessionStatus === "authenticated" ? editing.query.data : null;
  const editor = useClassificationDraft(target, current ?? null);
  const custom = useWatch({ control: editor.form.control, name: "custom" });
  const divisions = useDivisions(custom === true);
  const reads = [
    authority.account,
    editing.query,
    ...(custom ? [divisions.query] : []),
  ];
  const requiredRead =
    reads.find(hasReadError) ??
    reads.find((query) => query.isPending) ??
    editing.query;
  const blocked =
    !authority.enabled || requiredRead.isPending || hasReadError(requiredRead);

  /** Pull refresh rereads this visit's existing data dependencies, never its mutation. */
  async function refresh() {
    if (editing.save.isPending) {
      return;
    }
    await Promise.all([
      editing.query.refetch(),
      ...(custom ? [divisions.query.refetch()] : []),
    ]);
  }

  const initialLoading =
    authority.sessionStatus === "restoring" ||
    (!hasReadError(requiredRead) && requiredRead.isLoading);
  const FeedbackLayout = initialLoading ? PageContent : ScreenState;

  return (
    <Page
      header={
        <PageHeader
          title={
            target.kind === "pack"
              ? "Classification du pack"
              : "Classification de la poule"
          }
        />
      }
    >
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            enabled={
              !blocked &&
              authority.sessionStatus === "authenticated" &&
              !editing.save.isPending
            }
            fetching={
              editing.query.isFetching ||
              (custom === true && divisions.query.isFetching)
            }
            onRefresh={refresh}
          />
        }
      >
        {blocked && (
          <FeedbackLayout>
            {!authority.enabled ? (
              <AccessFeedback
                {...authority}
                loadingContent={<ClassificationLoading />}
              />
            ) : (
              <ReadFeedback
                query={requiredRead}
                loadingContent={<ClassificationLoading />}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent
          style={blocked ? styles.hidden : undefined}
          accessibilityElementsHidden={blocked}
          importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
        >
          {editor.state.revision && (
            <ClassificationForm
              target={target}
              current={current ?? null}
              editing={editing}
              editor={editor}
              divisions={divisions}
            />
          )}
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
