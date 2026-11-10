import { useState } from "react";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ClassificationLoading } from "../components/sporting-editor-loading";
import { ScreenState } from "../../../shared/components/screen-state";
import { ReadFeedback } from "../../../shared/components/read-feedback";
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
export function ClassificationScreen({
  target,
}: Readonly<ClassificationScreenProps>) {
  const editing = useClassification(target);
  const divisions = useDivisions();
  const { authority } = editing;
  const current =
    authority.sessionStatus === "authenticated"
      ? editing.query.data
      : undefined;
  const identity = `${authority.session.subject}:${target.kind}:${target.id}`;
  // Initial choice admission is visit-local; a later refusal must not dispose the RHF draft.
  const [admission, setAdmission] = useState({ identity, ready: false });
  const needsInitialChoices = current?.setting != null;
  if (admission.identity !== identity) {
    setAdmission({ identity, ready: false });
  } else if (
    !admission.ready &&
    current &&
    (!needsInitialChoices || divisions.query.data)
  ) {
    setAdmission({ identity, ready: true });
  }
  const waitingForChoices =
    !admission.ready && needsInitialChoices && !divisions.query.data;

  /** Recovers only the first composition's required reads; it never sends a correction. */
  async function retryInitial() {
    await Promise.all([
      editing.query.refetch(),
      ...(needsInitialChoices ? [divisions.query.refetch()] : []),
    ]);
  }

  const loading = authority.enabled
    ? editing.query.isLoading ||
      (waitingForChoices && divisions.query.isLoading)
    : authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading);
  const FeedbackLayout = loading ? PageContent : ScreenState;
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
  } else if (waitingForChoices) {
    blockingState = loading ? (
      <ClassificationLoading />
    ) : (
      <ErrorState
        onRetry={() => void retryInitial()}
        retrying={editing.query.isFetching || divisions.query.isFetching}
      />
    );
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
      {blockingState ? (
        <FormScrollView>
          <FeedbackLayout>{blockingState}</FeedbackLayout>
        </FormScrollView>
      ) : (
        current && (
          <ClassificationForm
            key={identity}
            target={target}
            current={current}
            editing={editing}
            divisions={divisions}
          />
        )
      )}
    </Page>
  );
}
