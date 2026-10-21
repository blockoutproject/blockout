import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../shared/components/button";
import { Sheet } from "../shared/components/sheet";
import { TextField } from "../shared/components/text-field";
import { useTheme } from "../shared/theme/theme-provider";
import { tokens } from "../shared/theme/tokens";

const examples = [
  { title: "Petite feuille", paragraphCount: 0 },
  { title: "Feuille intermédiaire", paragraphCount: 5 },
  { title: "Grande feuille", paragraphCount: 18 },
] as const;

/** Three bounded content lengths exercise the same shared production controls. */
type Example = (typeof examples)[number];

/** Local manual cases mounted temporarily under the application's real providers, outside production routing. */
export function SheetExamplesScreen() {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          label="Brouillon initial"
          value={draft}
          onChangeText={setDraft}
        />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          React Native Bottom Sheet
        </Text>
        {examples.map((example) => (
          <SheetExample key={example.paragraphCount} example={example} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Opens the shared modal with the library's ref API; confirmation dismisses this local example only. */
function SheetExample({ example }: { example: Example }) {
  const modal = useRef<BottomSheetModal>(null);
  return (
    <>
      <Button
        label={example.title}
        fullWidth
        onPress={() => modal.current?.present()}
      />
      <Sheet
        ref={modal}
        title={example.title}
        message="Présentation standard et formulaire défilant."
        footer={
          <Button
            label="Confirmer"
            fullWidth
            onPress={() => modal.current?.dismiss()}
          />
        }
      >
        <ExampleFields paragraphCount={example.paragraphCount} />
      </Sheet>
    </>
  );
}

/** Owns local input that resets on modal unmount and uses the upstream integrated input directly. */
function ExampleFields({ paragraphCount }: { paragraphCount: number }) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [last, setLast] = useState("");
  return (
    <>
      <TextField
        label="Nom du club"
        value={name}
        onChangeText={setName}
        inputComponent={BottomSheetTextInput}
      />
      {Array.from({ length: paragraphCount }, (_, index) => (
        <Text key={index} style={[styles.body, { color: colors.text }]}>
          Paragraphe {index + 1}. Le contenu doit défiler pour atteindre le
          dernier champ et la confirmation.
        </Text>
      ))}
      <TextField
        label="Dernier champ"
        value={last}
        onChangeText={setLast}
        inputComponent={BottomSheetTextInput}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.section },
  title: tokens.typography.heading,
  body: tokens.typography.body,
});
