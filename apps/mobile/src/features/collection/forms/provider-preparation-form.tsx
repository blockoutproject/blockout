import { Surface } from "../../../shared/components/surface";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useFormState } from "react-hook-form";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { useRouter } from "expo-router";
import { ChevronRight, Globe, Trophy } from "lucide-react-native";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  CollectionProviderEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import type { useSeasonPreparation } from "../api/use-source-preparation";
import {
  EmptySources,
  SeasonIdentity,
  SourceBadge,
  preparationStyles,
} from "../components/preparation-layout";
import { CreateSourceForm } from "./create-source-form";
import { providerPreparationEditor } from "./provider-preparation-editor";
import { createSourceValues } from "./create-source-values";

/** Shares the original season revision and launch selection with its retained manual-source draft. */
export interface ProviderPreparationFormProps {
  season: CollectionSeasonResponse;
  provider: CollectionProviderEnum;
  editing: ReturnType<typeof useSeasonPreparation>;
}

/** A season-revision snapshot protects the explicit selection and the manual addition form through reconciliation. */
export function ProviderPreparationForm({
  season,
  provider,
  editing,
}: ProviderPreparationFormProps) {
  const { authority } = editing;
  const { session } = authority;
  const router = useRouter();
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const confirmAction = useActionConfirmation();
  const mounted = useRef(false);
  const [editor] = useState(() =>
    providerPreparationEditor(session, season, provider),
  );
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline, selected, adding } = state;
  const feedback =
    state.feedback ??
    (editing.create.needsRead
      ? "Le résultat doit être vérifié avant une nouvelle action."
      : editing.seasonInvalidated
        ? "L’état de la saison doit être relu avant une nouvelle action."
        : undefined);
  const { isDirty } = useFormState({ control: editor.form.control });
  const confirmDiscard = useDiscardChanges(isDirty, editor.discard);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const sources =
    editing.sources.data?.items.filter(
      (source) => source.provider === provider,
    ) ?? [];
  const closed = season.state === "closed";
  const busy =
    editing.sources.isError ||
    !authority.enabled ||
    editing.create.pending ||
    editing.season.isFetching ||
    editing.sources.isFetching;
  const reconciliationRequired =
    editing.create.needsRead ||
    editing.seasonInvalidated ||
    season.revision > baseline.revision;
  const rereadRequired = reconciliationRequired || editing.season.isError;
  const ready = sources
    .filter(
      (source) =>
        source.validation === "qualified" &&
        !source.launched &&
        (source.locked ? source.acceptedUrl : source.candidateUrl),
    )
    .map((source) => source.id);
  const selection = selected ?? ready;
  const canLaunch =
    !closed &&
    selection.length > 0 &&
    selection.every((id) => ready.includes(id));
  const Icon = provider === "lnv" ? Trophy : Globe;

  /** Cancels only this addition; the retained provider owner still protects subsequent drafts. */
  async function cancelAddition() {
    if (editing.create.isPending()) return;
    const accepted = await confirmDiscard(() => {
      if (
        mounted.current &&
        session.isCurrent(session.generation) &&
        !editing.create.isPending()
      )
        editor.form.reset(createSourceValues());
    });
    if (
      !accepted ||
      !mounted.current ||
      !session.isCurrent(session.generation) ||
      editing.create.isPending()
    )
      return;
    editor.update({ ...editor.getSnapshot(), adding: false });
  }

  /** Leaves selection and manual values intact; only uncertain/conflicting commands require reconciliation. */
  function failed(error: unknown) {
    if (!session.isCurrent(session.generation)) return;
    if (requiresRevisionRead(error)) {
      editor.update({
        ...editor.getSnapshot(),
        feedback: "Le résultat doit être vérifié avant une nouvelle action.",
      });
    } else {
      editor.update({ ...editor.getSnapshot(), feedback: undefined });
      actionFeedback.error(
        "L’action a été refusée. Votre saisie est conservée.",
      );
    }
  }
  /** Presents the actual selected labels; a native confirmation never broadens the atomic launch scope. */
  async function confirmLaunch() {
    if (busy || rereadRequired || !canLaunch) return;
    editor.update({ ...state, selected: selection });
    if (
      !(await confirmAction({
        title: "Lancer les sources prêtes ?",
        message: `${sources
          .filter((source) => selection.includes(source.id))
          .map((source) => source.label)
          .join(
            ", ",
          )}\nLes liens sélectionnés seront verrouillés. Ce lancement ne garantit pas que toutes les sources ont publié une saison complète.`,
        confirmLabel: "Lancer",
      }))
    )
      return;
    await launch(selection);
  }
  /** Sends exactly the selection against its read revision and clears it only after confirmed acceptance. */
  async function launch(confirmed: string[]) {
    if (
      !session.isCurrent(session.generation) ||
      busy ||
      rereadRequired ||
      !canLaunch
    )
      return;
    try {
      const attempt = editing.launch.start({
        revision: baseline.revision,
        sourceBindingIds: confirmed,
      });
      if (!attempt) return;
      editor.update({ ...editor.getSnapshot(), feedback: undefined });
      actionFeedback.clear();
      const accepted = await attempt;
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        ...editor.getSnapshot(),
        baseline: accepted,
        selected: null,
        feedback: "Sources sélectionnées lancées.",
      });
    } catch (error) {
      failed(error);
    }
  }
  /** Reads the entire launch context; a failed half-read cannot unlock an old selection or replay its command. */
  async function reread() {
    const {
      result: [seasonResult, sourcesResult],
      reconciled,
    } = await editing.create.reconcile(
      [editing.seasonKey, editing.sourcesKey],
      () => Promise.all([editing.season.refetch(), editing.sources.refetch()]),
      ([seasonRead, sourcesRead]) =>
        !seasonRead.isError &&
        !!seasonRead.data &&
        seasonRead.data.revision >= baseline.revision &&
        !sourcesRead.isError &&
        !!sourcesRead.data,
    );
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (
      !reconciled ||
      seasonResult.isError ||
      sourcesResult.isError ||
      !seasonResult.data ||
      !sourcesResult.data ||
      seasonResult.data.revision < baseline.revision
    ) {
      editor.update({
        ...editor.getSnapshot(),
        feedback: "La relecture a échoué. Votre saisie est conservée.",
      });
      return;
    }
    editor.update({
      ...editor.getSnapshot(),
      baseline: seasonResult.data,
      feedback: "État relu. Vérifiez votre saisie avant une nouvelle action.",
    });
  }
  return (
    <View style={preparationStyles.form}>
      <SeasonIdentity season={season} />
      {closed && (
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Saison clôturée
        </Text>
      )}
      {sources.length === 0 && (
        <EmptySources
          label={
            provider === "lnv"
              ? "Aucun championnat découvert"
              : "Aucune source découverte"
          }
        />
      )}
      {sources.map((source) => (
        <Surface key={source.id}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Préparer ${source.label}`}
            onPress={() =>
              router.push({
                pathname: "/collection/[seasonId]/sources/[sourceId]",
                params: { seasonId: season.id, sourceId: source.id },
              })
            }
            style={({ pressed }) => [
              styles.source,
              { opacity: pressed ? tokens.opacity.pressed : 1 },
            ]}
          >
            <Icon
              accessible={false}
              color={colors.icon}
              size={tokens.size.actionIcon}
            />
            <View style={styles.identity}>
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                {source.label}
              </Text>
              <SourceBadge source={source} />
            </View>
            <ChevronRight
              accessible={false}
              color={colors.icon}
              size={tokens.size.controlIcon}
            />
          </Pressable>
        </Surface>
      ))}
      {!closed && (
        <>
          <Button
            label="Lancer les sources prêtes"
            fullWidth
            onPress={confirmLaunch}
            disabled={busy || rereadRequired || !canLaunch}
            loading={editing.launch.executing}
          />
          {selected !== null && !canLaunch && (
            <Button
              label="Revenir aux sources prêtes"
              variant="secondary"
              onPress={() => editor.update({ ...state, selected: null })}
              disabled={busy}
            />
          )}
          {!adding && (
            <Button
              label="Ajouter une source"
              variant="secondary"
              onPress={() => editor.update({ ...state, adding: true })}
              disabled={busy}
            />
          )}
        </>
      )}
      {adding && (
        <Surface>
          <CreateSourceForm
            editor={editor}
            provider={provider}
            editing={editing}
            disabled={busy || closed || rereadRequired}
            onCancel={() => void cancelAddition()}
          />
        </Surface>
      )}
      {feedback && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {feedback}
        </Text>
      )}
      {(editing.season.isError || editing.sources.isError) && !feedback && (
        <RequestError
          message="La relecture a échoué. Votre saisie est conservée."
          onRetry={() => {
            void editing.season.refetch({ cancelRefetch: false });
            void editing.sources.refetch({ cancelRefetch: false });
          }}
          retrying={editing.season.isFetching || editing.sources.isFetching}
        />
      )}
      {reconciliationRequired && (
        <Button
          label="Relire l’état"
          variant="secondary"
          onPress={() => void reread()}
          disabled={busy}
          loading={editing.season.isFetching || editing.sources.isFetching}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
    minHeight: tokens.size.control,
  },
  identity: { flex: 1, gap: tokens.spacing.xs },
});
