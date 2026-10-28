import { useActionFeedback } from "../../../shared/components/action-feedback";
import { zodResolver } from "@hookform/resolvers/zod";
import Slider from "@react-native-community/slider";
import { Minus, Plus } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../shared/components/button";
import { IconButton } from "../../../shared/components/icon-button";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import {
  ageSchema,
  type AgeValues,
  type AgeSubmission,
} from "../schemas/age-schema";
import { ageValues } from "./age-values";

/** A confirmed explicit age is transient; the caller owns category/date persistence and subsequent navigation. */
export interface AgeFormProps {
  pending: boolean;
  /** Entry continues; correction uses the approved save action without changing selection semantics. */
  submitLabel?: "Continuer" | "Enregistrer";
  onSubmit(age: number): Promise<unknown> | undefined;
}

/** Shared neutral entry/renewal/correction control; unmounting cancels unsubmitted edits without saving. */
export function AgeForm({
  pending,
  onSubmit,
  submitLabel = "Continuer",
}: AgeFormProps) {
  const { colors } = useTheme();
  const feedback = useActionFeedback();
  const { control, handleSubmit } = useForm<AgeValues, unknown, AgeSubmission>({
    defaultValues: ageValues(),
    resolver: zodResolver(ageSchema),
  });

  /** A rejected write leaves the selected age editable; only an explicit new confirmation retries it. */
  async function submit(values: AgeSubmission) {
    if (pending) return;
    try {
      const operation = onSubmit(values.age);
      if (!operation) return;
      feedback.clear();
      await operation;
    } catch {
      feedback.error();
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[tokens.typography.body, { color: colors.secondaryText }]}>
        Pour une expérience adaptée.
      </Text>
      <Controller
        control={control}
        name="age"
        render={({ field: { value, onChange } }) => (
          <View style={styles.fields}>
            <View style={styles.selector}>
              <View style={styles.value}>
                <Text
                  style={[tokens.typography.displayAge, { color: colors.text }]}
                >
                  {value === null ? "—" : value === 100 ? "100+" : value}
                </Text>
                {value !== null && (
                  <Text
                    style={[
                      tokens.typography.body,
                      { color: colors.secondaryText },
                    ]}
                  >
                    {value === 1 ? "an" : "ans"}
                  </Text>
                )}
              </View>
              <View style={styles.adjust}>
                <IconButton
                  label="Diminuer l’âge"
                  disabled={pending || value === 0}
                  onPress={() => onChange(Math.max(0, (value ?? 0) - 1))}
                >
                  <Minus size={tokens.size.icon.lg} color={colors.icon} />
                </IconButton>
                <Slider
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel="Âge en années révolues"
                  accessibilityHint={`Choisissez votre âge de zéro à cent ans ou plus, puis confirmez avec ${submitLabel}.`}
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    ...(value === null ? {} : { now: value }),
                    text:
                      value === null
                        ? "Aucun âge sélectionné"
                        : value === 100
                          ? "100 ans ou plus"
                          : `${value} ${value === 1 ? "an" : "ans"}`,
                  }}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={value ?? 0}
                  onValueChange={onChange}
                  onSlidingComplete={onChange}
                  disabled={pending}
                  minimumTrackTintColor={colors.border}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.accentPrimary}
                  // The native slider thumb is 20 points; its size is independent of icon roles.
                  thumbSize={20}
                  style={styles.slider}
                />
                <IconButton
                  label="Augmenter l’âge"
                  disabled={pending || value === 100}
                  onPress={() => onChange(Math.min(100, (value ?? 0) + 1))}
                >
                  <Plus size={tokens.size.icon.lg} color={colors.icon} />
                </IconButton>
              </View>
            </View>
            <Button
              label={submitLabel}
              fullWidth
              loading={pending}
              disabled={pending || value === null}
              onPress={() => void handleSubmit(submit)()}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
  fields: { gap: tokens.layout.section.gap },
  selector: { gap: tokens.spacing.xs },
  value: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "baseline",
    gap: tokens.layout.form.labelGap,
  },
  adjust: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  slider: {
    flex: 1,
    minHeight: tokens.touch.minimum,
  },
});
