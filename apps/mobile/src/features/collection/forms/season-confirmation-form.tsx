import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm, useFormState, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { TextField } from "@/shared/components/text-field";
import { useDiscardChanges } from "@/shared/forms/use-discard-changes";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import type { useCollectionSeasonCommand } from "../api/use-collection-season";
import {
  seasonCommands,
  seasonCommandsByState,
  type SeasonCommand,
} from "../model/season-command";
import {
  seasonConfirmationSchema,
  type SeasonConfirmationValues,
} from "../schemas/season-confirmation-schema";

/** The mounted visit owns its original label and local input across season reads. */
export function SeasonConfirmationForm({
  blocked,
  command,
  editing,
}: Readonly<{
  blocked: boolean;
  command: SeasonCommand;
  editing: ReturnType<typeof useCollectionSeasonCommand>;
}>) {
  const { season, submit } = editing;
  const { colors } = useTheme();
  const feedback = useActionFeedback({ retainSuccessOnUnmount: true });
  const router = useRouter();
  const activating = command === "activation";
  const current = submit.data?.state === "closed" ? submit.data : season.data;
  const [originalLabel, setOriginalLabel] = useState(current?.label);
  if (originalLabel === undefined && current) {
    setOriginalLabel(current.label);
  }
  const { control, handleSubmit, reset } = useForm<SeasonConfirmationValues>({
    resolver: zodResolver(seasonConfirmationSchema),
    defaultValues: { confirmation: "" },
  });
  const { isDirty } = useFormState({ control });
  const confirmation = useWatch({ control, name: "confirmation" });
  const terminal =
    current !== undefined &&
    !seasonCommandsByState[current.state].some(
      (available) => available === command,
    );
  const disablePrevention = useDiscardChanges(isDirty && !terminal, reset);
  if (!current) {
    return null;
  }

  const label = current.label;
  const unavailable = blocked || submit.isPending;
  const matches = (value: string) => value === label && value === originalLabel;

  function confirm(values: SeasonConfirmationValues) {
    if (unavailable || terminal || !matches(values.confirmation)) {
      return;
    }
    feedback.clear();
    submit.mutate(values.confirmation, {
      onSuccess() {
        if (!activating) {
          return;
        }
        reset();
        disablePrevention();
        feedback.success("Saison activée.");
        router.back();
      },
      onError: () => feedback.error(),
    });
  }

  return (
    <View style={styles.form}>
      {terminal ? (
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          {current.state === "closed"
            ? "Saison clôturée - historique conservé"
            : "Saison active"}
        </Text>
      ) : (
        <>
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            {activating
              ? `Les collectes périodiques des compétitions éligibles de la saison ${label} seront autorisées.`
              : `Les collectes FFVB et LNV de la saison ${label} seront arrêtées définitivement. Un cycle déjà en cours pourra se terminer. L’historique sera conservé. Aucune réouverture ni nouvelle collecte ne sera possible.`}
          </Text>
          <Controller
            control={control}
            name="confirmation"
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label={`Saisissez ${label} pour confirmer`}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                editable={!unavailable}
                error={fieldState.error?.message}
              />
            )}
          />
          <Button
            label={seasonCommands[command].label}
            variant={activating ? "primary" : "destructive"}
            fullWidth
            disabled={unavailable || !matches(confirmation)}
            loading={submit.isPending}
            onPress={() => void handleSubmit(confirm)()}
          />
        </>
      )}
      <Button
        label={terminal ? "Retour à la saison" : "Annuler"}
        variant="secondary"
        fullWidth
        onPress={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: tokens.layout.form.gap } });
