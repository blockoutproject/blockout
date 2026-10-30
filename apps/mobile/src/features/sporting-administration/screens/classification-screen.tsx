import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { ErrorState } from "../../../shared/components/state-card";
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
  const blockingState = !current ? (
    !authority.enabled ? (
      <AccessFeedback {...authority} />
    ) : editing.query.isError ? (
      <ErrorState
        onRetry={() =>
          void editing.query.refetch().then((result) => {
            if (result.isError && result.data) feedback.error();
          })
        }
        retrying={editing.query.isFetching}
      />
    ) : (
      <RequestLoading />
    )
  ) : undefined;
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome
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
        {({ onScroll, headerHeight }) => (
          <FormScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              !blockingState && authority.sessionStatus === "authenticated" ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  enabled={!editing.save.isPending}
                  refreshing={
                    editing.query.isRefetching ||
                    divisions.query.isRefetching ||
                    authority.account.isRefetching
                  }
                  onRefresh={() => {
                    if (editing.save.isPending) return;
                    if (!authority.enabled) {
                      void authority.account.refetch().then((result) => {
                        if (result.isError && result.data) feedback.error();
                      });
                      return;
                    }
                    void editing.query.refetch().then((result) => {
                      if (result.isError && result.data) feedback.error();
                    });
                    void divisions.query.refetch().then((result) => {
                      if (result.isError && result.data) feedback.error();
                    });
                  }}
                />
              ) : undefined
            }
          >
            {blockingState ? (
              <ScreenState>{blockingState}</ScreenState>
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
        )}
      </ScrollChrome>
    </Page>
  );
}
