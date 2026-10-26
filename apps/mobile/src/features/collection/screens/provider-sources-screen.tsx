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
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useSeasonPreparation } from "../api/use-source-preparation";
import {
  CollectionAccessFeedback,
  EmptySources,
  PreparationPage,
  SeasonIdentity,
  SourceBadge,
  preparationStyles,
} from "../components/preparation-layout";
import { CreateSourceForm } from "../forms/create-source-form";
import {
  providerPreparationEditor,
  discardProviderPreparationEditor,
} from "../forms/preparation-editors";
import type { CreateSourceValues } from "../schemas/source-candidate";

/** Provider preparation retains its manual draft and reads its form owner directly for navigation discard. */
export interface ProviderSourcesScreenProps {
  seasonId: string;
  provider: CollectionProviderEnum;
}

/** Lists missing/discovered source coverage and launches only explicitly selected qualified bindings. */
export function ProviderSourcesScreen({
  seasonId,
  provider,
}: ProviderSourcesScreenProps) {
  const editing = useSeasonPreparation(seasonId);
  const { authority, season, sources } = editing;
  const current =
    authority.sessionStatus === "authenticated" ? season.data : undefined;
  return (
    <PreparationPage title={provider === "lnv" ? "LNV" : "FFVB"}>
      <CollectionAccessFeedback authority={authority} />
      {current && sources.data ? (
        <ProviderPreparation
          key={`${authority.session.generation}:${seasonId}:${provider}`}
          season={current}
          provider={provider}
          editing={editing}
        />
      ) : (
        authority.enabled &&
        (season.isError || sources.isError ? (
          <RequestError
            message="Les sources sont indisponibles."
            onRetry={() => {
              void season.refetch();
              void sources.refetch();
            }}
            retrying={season.isFetching || sources.isFetching}
          />
        ) : (
          <RequestLoading />
        ))
      )}
    </PreparationPage>
  );
}

/** A season-revision snapshot protects the explicit selection and the manual addition form through reconciliation. */
function ProviderPreparation({
  season,
  provider,
  editing,
}: {
  season: CollectionSeasonResponse;
  provider: CollectionProviderEnum;
  editing: ReturnType<typeof useSeasonPreparation>;
}) {
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
  useDiscardChanges(isDirty, () => {
    editor.form.reset();
    discardProviderPreparationEditor();
  });
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
    !authority.enabled ||
    editing.create.pending ||
    editing.season.isFetching ||
    editing.sources.isFetching;
  const rereadRequired =
    editing.create.needsRead ||
    editing.seasonInvalidated ||
    editing.season.isError ||
    season.revision > baseline.revision;
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
  /** Adds a candidate and resets its retained fields only on acceptance, without qualification or periodic launch. */
  async function create(values: CreateSourceValues) {
    if (busy || closed || rereadRequired) return;
    try {
      const attempt = editing.create.start({
        seasonRevision: baseline.revision,
        provider,
        ...values,
      });
      if (!attempt) return;
      editor.update({ ...editor.getSnapshot(), feedback: undefined });
      actionFeedback.clear();
      await attempt;
      if (!session.isCurrent(session.generation)) return;
      editor.form.reset();
      editor.update({
        ...editor.getSnapshot(),
        adding: false,
        feedback: "Source ajoutée. Relisez l’état avant une nouvelle action.",
      });
    } catch (error) {
      failed(error);
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
            accessibilityRole="button"
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
            formControl={editor.form.formControl}
            disabled={busy || closed || rereadRequired}
            executing={editing.create.executing}
            onSubmit={create}
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
        <RequestError message="La relecture a échoué. Votre saisie est conservée." />
      )}
      <Button
        label="Relire l’état"
        variant="secondary"
        onPress={() => void reread()}
        disabled={busy}
        loading={editing.season.isFetching || editing.sources.isFetching}
      />
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
