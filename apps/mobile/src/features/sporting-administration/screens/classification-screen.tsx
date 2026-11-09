import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ClassificationLoading } from "../components/sporting-editor-loading";
import { ScreenState } from "../../../shared/components/screen-state";
import { ReadFeedback } from "../../../shared/components/read-feedback";

import { AccessFeedback } from "../../access/components/access-feedback";
import {
  useClassification,
  useDivisions,
  type ClassificationTarget,
} from "../api/classification";
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

  /** One explicit refresh owns both reads and reports their retained-data failure once. */
  async function refresh() {
    if (editing.save.isPending) {
      return;
    }
    feedback.clear();
    const results = await Promise.all(
      !authority.enabled
        ? [authority.account.refetch()]
        : [editing.query.refetch(), divisions.query.refetch()],
    );
    if (results.some((result) => result.isError && result.data)) {
      feedback.error();
    }
  }

  const loading = authority.enabled
    ? editing.query.isLoading
    : authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading);
  const FeedbackLayout = !current && loading ? PageContent : ScreenState;
  let blockingState;
  if (!current) {
    if (!authority.enabled) {
      blockingState = (
        <AccessFeedback
          {...authority}
          loadingContent={<ClassificationLoading />}
        />
      );
    } else {
      blockingState = (
        <ReadFeedback
          query={editing.query}
          loadingContent={<ClassificationLoading />}
        />
      );
    }
  } else {
    blockingState = undefined;
  }
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
          !blockingState && authority.sessionStatus === "authenticated" ? (
            <DataRefreshControl
              enabled={!editing.save.isPending}
              onRefresh={refresh}
            />
          ) : undefined
        }
      >
        {blockingState ? (
          <FeedbackLayout>{blockingState}</FeedbackLayout>
        ) : (
          <PageContent>
            {current && (
              <ClassificationForm
                key={`${authority.session.subject}:${target.kind}:${target.id}`}
                target={target}
                current={current}
                editing={editing}
                divisions={divisions}
              />
            )}
          </PageContent>
        )}
      </FormScrollView>
    </Page>
  );
}
