import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListDivisionsQueryKey } from "../../../../.generated/mobile";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { useClassificationVisit } from "../forms/classification-visit";
import { ClassificationLoading } from "../components/sporting-editor-loading";
import { ScreenState } from "@/shared/components/screen-state";
import { ReadFeedback } from "@/shared/components/read-feedback";

import { AccessFeedback } from "@/features/access/components/access-feedback";
import {
  useClassification,
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
  const client = useQueryClient();
  const { authority } = editing;
  const visit = useClassificationVisit()?.visit;
  const feedback = useActionFeedback();
  const current =
    authority.sessionStatus === "authenticated" ? editing.query.data : null;
  const identity = `${authority.session.subject}:${target.kind}:${target.id}`;
  const [admission, setAdmission] = useState({ identity, ready: false });
  if (admission.identity !== identity) {
    setAdmission({ identity, ready: false });
  } else if (!admission.ready && current) {
    setAdmission({ identity, ready: true });
  }

  /** Reads the live RHF intention without mirroring it; catalogue errors have the form's recovery owner. */
  async function refresh() {
    if (editing.save.isPending) {
      return;
    }
    const custom =
      visit?.target.kind === target.kind && visit.target.id === target.id
        ? visit.form.getValues("custom")
        : current?.setting != null;
    feedback.clear();
    const [result] = await Promise.all(
      !authority.enabled
        ? [authority.account.refetch()]
        : [
            editing.query.refetch(),
            ...(custom
              ? [
                  client.refetchQueries({
                    queryKey: getListDivisionsQueryKey({
                      includeInactive: true,
                    }),
                    exact: true,
                  }),
                ]
              : []),
          ],
    );
    if (result.isError && result.data && !custom) {
      feedback.error();
    }
  }

  const loading = authority.enabled
    ? editing.query.isLoading
    : authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading);
  const FeedbackLayout = loading ? PageContent : ScreenState;
  let blockingState;
  if (!admission.ready) {
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
            {admission.ready && (
              <ClassificationForm
                key={identity}
                target={target}
                current={current ?? null}
                editing={editing}
              />
            )}
          </PageContent>
        )}
      </FormScrollView>
    </Page>
  );
}
