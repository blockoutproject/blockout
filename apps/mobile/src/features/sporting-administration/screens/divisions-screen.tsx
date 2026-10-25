import { useState, useSyncExternalStore } from "react";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { DivisionResponse } from "../../../../.generated/schemas/index.zod";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useDivisions, useDivisionActivity } from "../api/classification";
import { EditorPage, SportingAccessFeedback } from "../components/editor-page";
import { PresentationEntry } from "../entry";
import { divisionActivityEditor } from "../forms/division-activity-editor";
/** Lists configured divisions under the canonical read grants, separating presentation and lifecycle actions. */
export function DivisionsScreen() {
  const { authority, query } = useDivisions();
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <EditorPage title="Divisions">
      <SportingAccessFeedback authority={authority} />
      {authority.permissions?.manageDivisionLifecycle === true && (
        <Button
          label="Créer une division"
          onPress={() => router.push("/administration/divisions/new")}
        />
      )}
      {query.isError && (
        <RequestError
          message="Les divisions sont indisponibles."
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      )}
      {authority.enabled && query.isPending && <RequestLoading />}
      {authority.enabled && query.data?.items.length === 0 && (
        <Text style={[tokens.typography.body, { color: colors.text }]}>
          Aucune division configurée
        </Text>
      )}
      {authority.sessionStatus === "authenticated" &&
        query.data?.items.map((division) => (
          <DivisionCard
            key={`${authority.session.generation}:${division.id}`}
            division={division}
            reading={query.isFetching}
            onRead={async () => {
              const result = await query.refetch();
              return result.isError
                ? undefined
                : result.data?.items.find((item) => item.id === division.id);
            }}
          />
        ))}
    </EditorPage>
  );
}
/** One division's presentation link and independent revision-guarded activity command. */
function DivisionCard({
  division,
  reading,
  onRead,
}: {
  division: DivisionResponse;
  reading: boolean;
  onRead: () => Promise<DivisionResponse | undefined>;
}) {
  const editing = useDivisionActivity(division.id);
  const { authority } = editing;
  const { session } = authority;
  const { colors } = useTheme();
  const [editor] = useState(() => divisionActivityEditor(session, division));
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline, feedback, needsRead } = state;
  const rereadRequired = needsRead || division.revision !== baseline.revision;
  const busy = !authority.enabled || editing.saving || reading;
  /** The action is reauthorized after confirmation; refusal and uncertainty retain the original revision. */
  async function save() {
    if (busy || rereadRequired || !session.isCurrent(session.generation))
      return;
    try {
      const accepted = await editing.save.mutateAsync({
        revision: baseline.revision,
        active: !baseline.active,
      });
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        baseline: accepted,
        needsRead: false,
        feedback: accepted.active
          ? "Division réactivée. Les autres restrictions restent applicables."
          : "Division désactivée. L’historique est conservé.",
      });
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        ...editor.getSnapshot(),
        needsRead:
          isUncertainMutationFailure(error) ||
          (error instanceof ApiError && error.status === 409),
        feedback:
          "L’action n’a pas abouti. Relisez l’état courant avant de réessayer.",
      });
    }
  }
  /** Reads this original division only; no lifecycle operation is replayed after a lost acknowledgement. */
  async function reread() {
    const result = await onRead();
    if (!session.isCurrent(session.generation)) return;
    if (!result) {
      editor.update({
        ...editor.getSnapshot(),
        needsRead: true,
        feedback: "La relecture a échoué.",
      });
      return;
    }
    editor.update({
      baseline: result,
      needsRead: false,
      feedback:
        "État relu. Toute nouvelle action demande une confirmation explicite.",
    });
  }
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[tokens.typography.strong, { color: colors.text }]}
      >
        {division.name}
      </Text>
      <Text style={[tokens.typography.body, { color: colors.text }]}>
        {division.active ? "Active" : "Inactive"}
      </Text>
      <PresentationEntry target={{ kind: "division", id: division.id }} />
      {feedback && (
        <Text
          accessibilityLiveRegion="polite"
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {feedback}
        </Text>
      )}
      {authority.permissions?.manageDivisionLifecycle === true && (
        <>
          {rereadRequired && (
            <Button
              label={`Relire ${division.name}`}
              variant="secondary"
              disabled={busy}
              onPress={() => void reread()}
            />
          )}
          <Button
            label={`${baseline.active ? "Désactiver" : "Réactiver"} ${division.name}`}
            variant="secondary"
            disabled={busy || rereadRequired}
            loading={editing.saving}
            onPress={() =>
              Alert.alert(
                baseline.active
                  ? "Désactiver la division ?"
                  : "Réactiver la division ?",
                baseline.active
                  ? "Les poules, équipes et matchs seront masqués sans effacer leur historique. La collecte s’arrêtera selon ses règles habituelles."
                  : "Seule l’inactivité sera levée. Les autres restrictions de visibilité et de collecte restent applicables.",
                [
                  { text: "Annuler", style: "cancel" },
                  { text: "Confirmer", onPress: () => void save() },
                ],
              )
            }
          />
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
  },
});
