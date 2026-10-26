import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../shared/components/button";
import { FormScrollView } from "../../shared/components/form-scroll-view";
import { TextField } from "../../shared/components/text-field";
import { useActionConfirmation } from "../../shared/forms/use-action-confirmation";
import { useTheme } from "../../shared/theme/theme-provider";
import { tokens } from "../../shared/theme/tokens";
import { exampleSchema, type ExampleValues } from "../schemas/example-schema";
import { exampleValues } from "./example-values";

/** The caller handles confirmed values; long content only exercises native scrolling. */
export interface ExampleFormProps {
  long?: boolean;
  onConfirm: (values: ExampleValues) => void;
}

/** Exercises ordinary editing with one platform-owned keyboard mechanism and an explicit native confirmation. */
export function ExampleForm({ long = false, onConfirm }: ExampleFormProps) {
  const { colors } = useTheme();
  const confirmAction = useActionConfirmation();
  const { control, handleSubmit } = useForm<ExampleValues>({
    resolver: zodResolver(exampleSchema),
    defaultValues: exampleValues(),
  });
  /** A disposed native decision cannot publish values to a replacement qualification route. */
  async function submit(values: ExampleValues) {
    if (
      await confirmAction({
        title: "Confirmer le formulaire ?",
        message: "Les valeurs saisies seront transmises après confirmation.",
        confirmLabel: "Confirmer",
      })
    )
      onConfirm(values);
  }
  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <FormScrollView>
        <SafeAreaView edges={["bottom"]} style={styles.content}>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label="Nom du club"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          {long &&
            Array.from({ length: 18 }, (_, index) => (
              <Text key={index} style={[styles.body, { color: colors.text }]}>
                Paragraphe {index + 1}. Le contenu doit défiler pour atteindre
                le dernier champ et la confirmation.
              </Text>
            ))}
          <Controller
            control={control}
            name="last"
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label="Dernier champ"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Button
            label="Confirmer"
            fullWidth
            onPress={() => void handleSubmit(submit)()}
          />
        </SafeAreaView>
      </FormScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.section },
  body: tokens.typography.body,
});
