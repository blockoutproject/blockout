import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";
import { Page, PageContent } from "../../shared/components/page";
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

/**
 * Exercises ordinary editing with one platform-owned keyboard mechanism and an explicit native confirmation.
 * The hosting native stack owns the top inset; Page owns the remaining safe edges.
 */
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
    <Page edges={["bottom", "left", "right"]}>
      <FormScrollView>
        <PageContent>
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
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  body: tokens.typography.body,
});
