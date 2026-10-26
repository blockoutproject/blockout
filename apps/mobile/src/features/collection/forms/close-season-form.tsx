import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Controller, useForm, useFormState, useWatch } from "react-hook-form";
import { Text, View } from "react-native";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { Surface } from "../../../shared/components/surface";
import { TextField } from "../../../shared/components/text-field";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import type { useCloseCollectionSeason } from "../api/use-collection-controls";
import {
  SeasonIdentity,
  preparationStyles,
} from "../components/preparation-layout";
import {
  closeSeasonSchema,
  type CloseSeasonValues,
} from "../schemas/close-season-schema";
import { closeSeasonEditor } from "./close-season-editor";

/** Exact typed input remains attached to the original season and survives temporary admission loss. */
export interface CloseSeasonFormProps {
  season: CollectionSeasonResponse;
  editing: ReturnType<typeof useCloseCollectionSeason>;
}

/** A closure decision owns its original revision; background results cannot replace the user's typed confirmation. */
export function CloseSeasonForm({ season, editing }: CloseSeasonFormProps) {
  const { authority } = editing;
  const { session } = authority;
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const router = useRouter();
  const mounted = useRef(false);
  const [editor] = useState(() => closeSeasonEditor(session, season));
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline } = state;
  const feedback =
    state.feedback ??
    (editing.close.needsRead
      ? "Le résultat doit être vérifié avant une nouvelle action."
      : editing.seasonInvalidated
        ? "L’état de la saison doit être relu avant une nouvelle action."
        : undefined);
  const { control, handleSubmit } = useForm<CloseSeasonValues>({
    resolver: zodResolver(closeSeasonSchema),
    formControl: editor.form.formControl,
  });
  const { isDirty } = useFormState({ control });
  const confirmation = useWatch({ control, name: "confirmation" });
  const current = editing.season.data ?? season;
  const closed = current.state === "closed";
  const busy =
    !authority.enabled || editing.close.pending || editing.season.isFetching;
  const needsRead =
    editing.close.needsRead ||
    editing.seasonInvalidated ||
    current.revision !== baseline.revision;
  useDiscardChanges(isDirty && !closed, editor.discard);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Exact equality and the original revision are checked before sending; the backend atomically rechecks both. */
  async function close(values: CloseSeasonValues) {
    if (
      busy ||
      closed ||
      needsRead ||
      editing.season.isError ||
      values.confirmation !== current.label ||
      values.confirmation !== baseline.label
    )
      return;
    editor.update({ ...editor.getSnapshot(), feedback: undefined });
    try {
      const attempt = editing.close.start({
        revision: baseline.revision,
        confirmation: values.confirmation,
      });
      if (!attempt) return;
      actionFeedback.clear();
      const accepted = await attempt;
      if (!session.isCurrent(session.generation)) return;
      editor.update({ baseline: accepted });
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      if (requiresRevisionRead(error))
        editor.update({
          ...editor.getSnapshot(),
          feedback: "Le résultat doit être vérifié avant une nouvelle action.",
        });
      else
        actionFeedback.error(
          "La clôture a été refusée. Votre saisie est conservée.",
        );
    }
  }

  /** Reads the actual lifecycle before any explicit retry; entered text stays RHF-owned and unchanged. */
  async function reread() {
    if (busy) return;
    const { result: read, reconciled } = await editing.close.reconcile(
      [editing.seasonKey],
      () => editing.season.refetch(),
      (read) =>
        !read.isError && !!read.data && read.data.revision >= baseline.revision,
    );
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (
      !reconciled ||
      read.isError ||
      !read.data ||
      read.data.revision < baseline.revision
    ) {
      editor.update({
        ...editor.getSnapshot(),
        feedback: "La relecture a échoué. Votre saisie est conservée.",
      });
      return;
    }
    editor.update({
      baseline: read.data,
      feedback:
        "État relu. Vérifiez le nom de la saison avant une nouvelle action.",
    });
  }

  return (
    <View style={preparationStyles.form}>
      <SeasonIdentity season={current} />
      {closed ? (
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Saison clôturée · historique conservé
        </Text>
      ) : (
        <Surface>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.heading, { color: colors.text }]}
          >
            Clôture définitive
          </Text>
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            Toutes les collectes FFVB et LNV de la saison {current.label} seront
            arrêtées. Un cycle déjà en cours pourra se terminer. L’historique
            sera conservé. Aucune réouverture ni nouvelle collecte ne sera
            possible.
          </Text>
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Les autres saisons, les fiches clubs et le géocodage restent
            inchangés.
          </Text>
          <Controller
            control={control}
            name="confirmation"
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label="Nom exact de la saison"
                helper={`Saisissez exactement ${current.label} pour confirmer.`}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                error={fieldState.error?.message}
              />
            )}
          />
          <Button
            label="Clôturer définitivement"
            fullWidth
            disabled={
              busy ||
              needsRead ||
              editing.season.isError ||
              confirmation !== current.label ||
              confirmation !== baseline.label
            }
            loading={editing.close.executing}
            onPress={() => void handleSubmit(close)()}
          />
          {isDirty && (
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              Confirmation non envoyée
            </Text>
          )}
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
      {editing.season.isError && !feedback && (
        <RequestError message="La relecture a échoué. Votre saisie est conservée." />
      )}
      {!closed && (
        <Button
          label="Relire l’état"
          variant="secondary"
          disabled={busy}
          loading={editing.season.isFetching}
          onPress={() => void reread()}
        />
      )}
      <Button
        label={closed ? "Retour à la saison" : "Annuler"}
        variant="secondary"
        onPress={() => {
          if (!isDirty || closed) editor.discard();
          router.back();
        }}
      />
    </View>
  );
}
