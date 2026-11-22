import { usePreventRemove, useRouter } from "expo-router";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import {
  useClassification,
  useDivisions,
  type ClassificationTarget,
} from "../api/classification";
import { ClassificationLoading } from "../components/sporting-editor-loading";
import {
  ClassificationForm,
  classificationFieldLabels,
  type ClassificationField,
} from "../forms/classification-form";
import { useClassificationDraft } from "../forms/use-classification-draft";

interface ClassificationScreenProps {
  target: ClassificationTarget;
  /** Authorized parent context for presentation. The correction is addressed by target alone. */
  title?: string;
  subtitle?: string;
}

/** Keys the form visit to its original principal, business account and correction target. */
export function ClassificationScreen(
  props: Readonly<ClassificationScreenProps>,
) {
  const { target } = props;
  const editing = useClassification(target);
  const { session } = editing.authority;
  return (
    <ClassificationVisit
      key={`${session.subject}:${session.accountId}:${target.kind}:${target.id}`}
      {...props}
      editing={editing}
    />
  );
}

function ClassificationVisit({
  target,
  title,
  subtitle,
  editing,
}: Readonly<
  ClassificationScreenProps & { editing: ReturnType<typeof useClassification> }
>) {
  const router = useRouter();
  const [choice, setChoice] = useState<ClassificationField>();
  const closeChoice = () => setChoice(undefined);
  const { authority, query, save } = editing;
  usePreventRemove(authority.enabled && choice !== undefined, closeChoice);
  const current =
    authority.sessionStatus === "authenticated" ? query.data : null;
  const form = useClassificationDraft(target.kind, current ?? null);
  const custom = useWatch({ control: form.control, name: "custom" });
  const divisions = useDivisions(custom === true);
  const reads = [
    authority.account,
    query,
    ...(custom ? [divisions.query] : []),
  ];
  const requiredRead =
    reads.find(hasReadError) ?? reads.find((read) => read.isPending);
  const blocked = !authority.enabled || !!requiredRead;
  const loading = <ClassificationLoading pool={target.kind === "pool"} />;
  const refreshable =
    !choice ||
    (choice === "divisionId" &&
      divisions.query.data?.items.some(({ active }) => active) === true);

  /** An explicit read refreshes only this visit's current prerequisites. */
  async function refresh() {
    await Promise.all([
      query.refetch(),
      ...(custom ? [divisions.query.refetch()] : []),
    ]);
  }

  return (
    <Sheet
      title={
        choice
          ? classificationFieldLabels[choice]
          : (title ??
            (target.kind === "pack"
              ? "Classification du pack"
              : "Classification de la poule"))
      }
      message={choice ? undefined : subtitle}
      onClose={choice ? closeChoice : router.back}
      closeDisabled={save.isPending}
      refreshControl={
        <DataRefreshControl
          enabled={refreshable && !blocked && !save.isPending}
          fetching={
            query.isFetching || (custom === true && divisions.query.isFetching)
          }
          onRefresh={refresh}
        />
      }
    >
      <SheetContent>
        {!authority.enabled ? (
          <AccessFeedback {...authority} loadingContent={loading} />
        ) : requiredRead ? (
          <ReadFeedback query={requiredRead} loadingContent={loading} />
        ) : undefined}
        <View
          style={blocked ? styles.hidden : undefined}
          accessibilityElementsHidden={blocked}
          importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
        >
          {form.formState.defaultValues && (
            <ClassificationForm
              kind={target.kind}
              form={form}
              editing={editing}
              divisionQuery={divisions.query}
              choice={choice}
              onChoice={setChoice}
            />
          )}
        </View>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
