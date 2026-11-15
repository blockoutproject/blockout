import { SeasonIdentity } from "../components/source-summary";
import { useRouter } from "expo-router";
import { Controller, useFormState, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { Surface } from "@/shared/components/surface";
import { TextField } from "@/shared/components/text-field";
import { useDiscardChanges } from "@/shared/forms/use-discard-changes";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import type { useCloseCollectionSeason } from "../api/use-collection-controls";
import { type CloseSeasonValues } from "../schemas/close-season-schema";
import { useCloseSeasonDraft } from "./use-close-season-draft";

/** Exact typed input belongs to the mounted original-season visit. */
export interface CloseSeasonFormProps {
  season: CollectionSeasonResponse | null | undefined;
  editing: ReturnType<typeof useCloseCollectionSeason>;
}

/** A closure decision retains its exact season target and the user's typed confirmation. */
export function CloseSeasonForm({
  season,
  editing,
}: Readonly<CloseSeasonFormProps>) {
  const { authority } = editing;
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const router = useRouter();
  const editor = useCloseSeasonDraft(season);
  const state = editor.state;
  const { feedback } = state;
  const { control, handleSubmit } = editor.form;
  const { isDirty } = useFormState({ control });
  const confirmation = useWatch({ control, name: "confirmation" });
  useDiscardChanges(isDirty && season?.state !== "closed", editor.discard);
  if (!state.baseline) {
    return null;
  }
  const baseline = state.baseline;

  const current = editing.season.data ?? baseline;
  const closed = current.state === "closed";
  const busy =
    !authority.enabled || !editing.season.data || editing.close.isPending;

  /** Exact confirmation is checked before sending; the backend atomically checks current eligibility. */
  async function close(values: CloseSeasonValues) {
    if (
      busy ||
      closed ||
      values.confirmation !== current.label ||
      values.confirmation !== baseline.label
    ) {
      return;
    }
    editor.update({ ...editor.state, feedback: undefined });
    try {
      const attempt = editing.close.mutateAsync({
        confirmation: values.confirmation,
      });
      actionFeedback.clear();
      const accepted = await attempt;
      editor.update({ baseline: accepted });
    } catch {
      actionFeedback.error();
    }
  }

  return (
    <View style={styles.form}>
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
              confirmation !== current.label ||
              confirmation !== baseline.label
            }
            loading={editing.close.isPending}
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

      <Button
        label={closed ? "Retour à la saison" : "Annuler"}
        variant="secondary"
        onPress={() => {
          if (!isDirty || closed) {
            editor.discard();
          }
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: tokens.layout.form.gap } });
