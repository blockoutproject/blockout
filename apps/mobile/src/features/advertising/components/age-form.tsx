import { zodResolver } from "@hookform/resolvers/zod";
import Slider from "@react-native-community/slider";
import { Minus, Plus } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "../../../shared/components/button";
import { IconButton } from "../../../shared/components/icon-button";
import { RequestError } from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { completedYearsSchema } from "../age-declaration";

const valuesSchema = z.object({
  age: completedYearsSchema.nullable().refine((age) => age !== null),
});
type AgeValues = z.input<typeof valuesSchema>;

/** A confirmed explicit age is transient; the caller owns category/date persistence and subsequent navigation. */
export interface AgeFormProps {
  onSubmit(age: number): Promise<unknown>;
}

/** Shared neutral entry/renewal/correction control; unmounting cancels unsubmitted edits without saving. */
export function AgeForm({ onSubmit }: AgeFormProps) {
  const { colors } = useTheme();
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { isSubmitting, errors },
  } = useForm<AgeValues, unknown, z.output<typeof valuesSchema>>({
    defaultValues: { age: null },
    resolver: zodResolver(valuesSchema),
  });

  /** A rejected write leaves the selected age editable; only an explicit new confirmation retries it. */
  async function submit(values: z.output<typeof valuesSchema>) {
    clearErrors("root");
    try {
      await onSubmit(values.age);
    } catch {
      setError("root", {
        message: "Votre choix n’a pas pu être enregistré. Réessayez.",
      });
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
                <Text style={[styles.number, { color: colors.text }]}>
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
                  disabled={isSubmitting || value === 0}
                  onPress={() => onChange(Math.max(0, (value ?? 0) - 1))}
                >
                  <Minus size={24} color={colors.icon} />
                </IconButton>
                <Slider
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel="Âge en années révolues"
                  accessibilityHint="Choisissez votre âge de zéro à cent ans ou plus, puis confirmez avec Continuer."
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
                  disabled={isSubmitting}
                  minimumTrackTintColor={colors.text}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.text}
                  thumbSize={20}
                  style={styles.slider}
                />
                <IconButton
                  label="Augmenter l’âge"
                  disabled={isSubmitting || value === 100}
                  onPress={() => onChange(Math.min(100, (value ?? 0) + 1))}
                >
                  <Plus size={24} color={colors.icon} />
                </IconButton>
              </View>
            </View>
            {errors.root?.message && (
              <RequestError message={errors.root.message} />
            )}
            <Button
              label="Continuer"
              fullWidth
              loading={isSubmitting}
              disabled={value === null}
              onPress={() => void handleSubmit(submit)()}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.spacing.lg },
  fields: { gap: tokens.spacing.section },
  selector: { gap: tokens.spacing.xs },
  value: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "baseline",
    gap: tokens.spacing.label,
  },
  number: { fontFamily: "Outfit-SemiBold", fontSize: 36, lineHeight: 51 },
  adjust: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  slider: { flex: 1, minHeight: tokens.touchTarget.android },
});
