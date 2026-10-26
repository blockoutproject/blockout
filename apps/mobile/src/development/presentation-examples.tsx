import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.section },
  title: tokens.typography.heading,
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  choiceLabel: { ...tokens.typography.body, flex: 1 },
});
