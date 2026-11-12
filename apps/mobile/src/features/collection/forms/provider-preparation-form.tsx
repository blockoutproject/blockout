import { SeasonIdentity, SourceBadge } from "../components/source-summary";
import { isCollectionReadRefused } from "../api/collection-queries";
import { Surface } from "../../../shared/components/surface";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { useFormState } from "react-hook-form";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { useRouter } from "expo-router";
import { ChevronRight, Globe, RefreshCw, Trophy } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  CollectionProviderEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import type { useSeasonPreparation } from "../api/use-source-preparation";
import { CreateSourceForm } from "./create-source-form";
import { useProviderPreparationDraft } from "./use-provider-preparation-draft";
import { createSourceValues } from "./create-source-values";

/** Shares a coherent season revision and selection with the mounted manual-source form. */
export interface ProviderPreparationFormProps {
  season: CollectionSeasonResponse;
  provider: CollectionProviderEnum;
  editing: ReturnType<typeof useSeasonPreparation>;
}

/** Keeps the original selection baseline until explicit reset or accepted save. */
export function ProviderPreparationForm({
  season,
  provider,
  editing,
}: Readonly<ProviderPreparationFormProps>) {
  const { authority } = editing;
  const router = useRouter();
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const confirmAction = useActionConfirmation();
  const mounted = useRef(false);
  const editor = useProviderPreparationDraft(season);
  const state = editor.state;
  const { baseline, selected, adding } = state;
  const feedback = state.feedback ?? undefined;
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
    isCollectionReadRefused(editing.sources.error) ||
    !authority.enabled ||
    editing.create.isPending ||
    editing.launch.isPending;
  const reconciliationRequired = season.revision > baseline.revision;
  const rereadRequired =
    reconciliationRequired || isCollectionReadRefused(editing.season.error);
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

  /** Cancels this mounted addition through the ordinary dirty-form confirmation. */
  async function cancelAddition() {
    if (editing.create.isPending) {
      return;
    }
    const accepted = await confirmDiscard(() => {
      if (mounted.current && !editing.create.isPending) {
        editor.form.reset(createSourceValues());
      }
    });
    if (!accepted || !mounted.current || editing.create.isPending) {
      return;
    }
    editor.update({ ...editor.state, adding: false });
  }

  /** Reports a failed launch while preserving its selected sources and accepted revision. */
  function failed() {
    editor.update({ ...editor.state, feedback: undefined });
    actionFeedback.error();
  }

  /** Presents the actual selected labels; a native confirmation never broadens the atomic launch scope. */
  async function confirmLaunch() {
    if (busy || rereadRequired || !canLaunch) {
      return;
    }
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
    ) {
      return;
    }
    await launch(selection);
  }

  /** Sends exactly the selection against its read revision and clears it only after confirmed acceptance. */
  async function launch(confirmed: string[]) {
    if (busy || rereadRequired || !canLaunch) {
      return;
    }
    try {
      const attempt = editing.launch.mutateAsync({
        revision: baseline.revision,
        sourceBindingIds: confirmed,
      });
      editor.update({ ...editor.state, feedback: undefined });
      actionFeedback.clear();
      const accepted = await attempt;
      editor.update({
        ...editor.state,
        baseline: accepted,
        selected: null,
        feedback: "Sources sélectionnées lancées.",
      });
    } catch {
      failed();
    }
  }

  /** Reads launch choices and season revision; failure or an older season response preserves selection and baseline. */
  async function reread() {
    const [seasonResult, sourcesResult] = await Promise.all([
      editing.season.refetch(),
      editing.sources.refetch(),
    ]);
    if (!mounted.current) {
      return;
    }
    if (
      seasonResult.isError ||
      sourcesResult.isError ||
      !seasonResult.data ||
      !sourcesResult.data ||
      seasonResult.data.revision < baseline.revision
    ) {
      actionFeedback.error();
      return;
    }
    editor.update({
      ...editor.state,
      baseline: seasonResult.data,
      feedback: "État relu. Vérifiez votre saisie avant une nouvelle action.",
    });
  }

  let retrySources: (() => void) | undefined;
  if (authority.enabled) {
    retrySources = () => void editing.sources.refetch();
  } else if (authority.sessionStatus === "authenticated") {
    retrySources = () => void authority.account.refetch();
  }

  return (
    <View style={styles.form}>
      <SeasonIdentity season={season} />
      {closed && (
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Saison clôturée
        </Text>
      )}
      {sources.length === 0 &&
        (editing.sources.isError ? (
          <ErrorState
            onRetry={retrySources}
            retrying={
              editing.sources.isFetching || authority.account.isFetching
            }
          />
        ) : (
          <EmptyState
            title={
              provider === "lnv"
                ? "Aucun championnat découvert"
                : "Aucune source découverte"
            }
          >
            <Button
              label="Actualiser"
              leadingIcon={RefreshCw}
              onPress={() => void editing.sources.refetch()}
              loading={editing.sources.isFetching}
              disabled={busy}
            />
          </EmptyState>
        ))}
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
              size={tokens.size.icon.lg}
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
              size={tokens.size.icon.md}
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
            loading={editing.launch.isPending}
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
  form: { gap: tokens.layout.form.gap },
  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
    minHeight: tokens.size.control.default,
  },
  identity: { flex: 1, gap: tokens.spacing.xs },
});
