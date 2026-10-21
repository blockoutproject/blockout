import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { Button } from "../shared/components/button";
import { Sheet } from "../shared/components/sheet";
import { TextField } from "../shared/components/text-field";
import { useTheme } from "../shared/theme/theme-provider";
import { tokens } from "../shared/theme/tokens";

/** Temporary route callbacks keep qualification examples outside the production entry. */
export interface PresentationExamplesProps {
  onOpenSheet: () => void;
  onOpenForm: (long: boolean) => void;
}

/** Retains a background draft while native routes open under the application's real providers. */
export function PresentationExamplesScreen({
  onOpenSheet,
  onOpenForm,
}: PresentationExamplesProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          Présentations natives
        </Text>
        <TextField
          label="Brouillon initial"
          value={draft}
          onChangeText={setDraft}
        />
        <Button label="Choix courts" fullWidth onPress={onOpenSheet} />
        <Button
          label="Formulaire court"
          fullWidth
          onPress={() => onOpenForm(false)}
        />
        <Button
          label="Formulaire long"
          fullWidth
          onPress={() => onOpenForm(true)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/** A native sheet route owns dismissal; this small choice resets when the route unmounts. */
export function ShortSheetExampleScreen({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const [finished, setFinished] = useState(false);
  return (
    <Sheet
      title="Filtres"
      message="Choisissez les rencontres à afficher."
      onClose={onClose}
    >
      <View style={styles.choice}>
        <Text style={[styles.choiceLabel, { color: colors.text }]}>
          Inclure les rencontres terminées
        </Text>
        <Switch
          accessibilityLabel="Inclure les rencontres terminées"
          value={finished}
          onValueChange={setFinished}
        />
      </View>
      <Button label="Appliquer" fullWidth onPress={onClose} />
    </Sheet>
  );
}

const formSchema = z.object({
  name: z.string().trim().min(1, "Saisissez le nom du club."),
  last: z.string().trim().min(1, "Complétez le dernier champ."),
});

/** Fictional values used only to qualify ordinary editing and explicit native confirmation. */
export type ExampleFormValues = z.infer<typeof formSchema>;

/** The caller handles confirmed values; long content only exercises native scrolling. */
export interface FormExampleProps {
  long?: boolean;
  onConfirm: (values: ExampleFormValues) => void;
}

/** Ordinary bounded form content uses iOS keyboard insets and Android's default resize behavior. */
export function FormExampleScreen({
  long = false,
  onConfirm,
}: FormExampleProps) {
  const { colors } = useTheme();
  const { control, handleSubmit } = useForm<ExampleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", last: "" },
  });
  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.canvas }]}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      <SafeAreaView edges={["bottom"]} style={styles.content}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
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
              Paragraphe {index + 1}. Le contenu doit défiler pour atteindre le
              dernier champ et la confirmation.
            </Text>
          ))}
        <Controller
          control={control}
          name="last"
          render={({ field, fieldState }) => (
            <TextField
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
          onPress={handleSubmit((values) =>
            Alert.alert(
              "Confirmer le formulaire ?",
              "Les valeurs saisies seront transmises après confirmation.",
              [
                { text: "Annuler", style: "cancel" },
                { text: "Confirmer", onPress: () => onConfirm(values) },
              ],
            ),
          )}
        />
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.section },
  title: tokens.typography.heading,
  body: tokens.typography.body,
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  choiceLabel: { ...tokens.typography.body, flex: 1 },
});
