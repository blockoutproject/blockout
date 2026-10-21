import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Button } from "../shared/components/button";
import { Sheet } from "../shared/components/sheet";
import { IconButton } from "../shared/components/icon-button";
import { TextField } from "../shared/components/text-field";
import { useTheme } from "../shared/theme/theme-provider";
import { tokens } from "../shared/theme/tokens";

const examples = [
  { title: "Petite feuille", paragraphCount: 0 },
  { title: "Feuille intermédiaire", paragraphCount: 5 },
  { title: "Grande feuille", paragraphCount: 18 },
] as const;
const message = "Présentation standard et formulaire défilant.";

/** The same bounded form lengths are presented by both libraries. */
type Example = (typeof examples)[number];

/** The temporary development route owns native navigation; the comparison owns no production routes. */
export interface SheetComparisonScreenProps {
  onOpenNative: (paragraphCount: Example["paragraphCount"]) => void;
}

/** Side-by-side manual trial with Gorhom's documented modal provider and gesture root. */
export function SheetComparisonScreen({
  onOpenNative,
}: SheetComparisonScreenProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  return (
    <GestureHandlerRootView style={styles.screen}>
      <BottomSheetModalProvider>
        <SafeAreaView
          style={[styles.screen, { backgroundColor: colors.canvas }]}
        >
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
              Form Sheet natif
            </Text>
            {examples.map((example) => (
              <Button
                key={example.paragraphCount}
                label={example.title}
                fullWidth
                onPress={() => onOpenNative(example.paragraphCount)}
              />
            ))}
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.text }]}
            >
              React Native Bottom Sheet
            </Text>
            {examples.map((example) => (
              <BottomSheetExample
                key={example.paragraphCount}
                example={example}
              />
            ))}
          </ScrollView>
        </SafeAreaView>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

/** Matching native form content; confirmation only dismisses this local trial. */
export interface NativeSheetComparisonProps {
  paragraphCount: Example["paragraphCount"];
  onConfirm: () => void;
}

/** Uses the existing native Sheet without changing its presentation or input behavior. */
export function NativeSheetComparison({
  paragraphCount,
  onConfirm,
}: NativeSheetComparisonProps) {
  const [name, setName] = useState("");
  const [last, setLast] = useState("");
  const example = examples.find(
    (item) => item.paragraphCount === paragraphCount,
  )!;
  return (
    <Sheet
      title={example.title}
      message={message}
      footer={<Button label="Confirmer" fullWidth onPress={onConfirm} />}
    >
      <TextField label="Nom du club" value={name} onChangeText={setName} />
      <Paragraphs count={paragraphCount} />
      <TextField label="Dernier champ" value={last} onChangeText={setLast} />
    </Sheet>
  );
}

/** Keeps default sizing and keyboard behavior, with system-safe placement and the built-in backdrop. */
function BottomSheetExample({ example }: { example: Example }) {
  const modal = useRef<BottomSheetModal>(null);
  const { top } = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <>
      <Button
        label={example.title}
        fullWidth
        onPress={() => modal.current?.present()}
      />
      <BottomSheetModal
        ref={modal}
        topInset={top}
        backdropComponent={SheetBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.icon }}
      >
        <BottomSheetForm
          example={example}
          onDismiss={() => modal.current?.dismiss()}
        />
      </BottomSheetModal>
    </>
  );
}

/** Shows the built-in backdrop at the modal's single dynamic snap point and hides it when closed. */
function SheetBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
  );
}

/** Keeps the final action above the system area; integrated inputs reset when the modal unmounts. */
function BottomSheetForm({
  example,
  onDismiss,
}: {
  example: Example;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [last, setLast] = useState("");
  const { bottom } = useSafeAreaInsets();
  return (
    <BottomSheetScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: tokens.spacing.lg + bottom },
      ]}
    >
      <View style={styles.introduction}>
        <View style={styles.titleRow}>
          <Text
            accessibilityRole="header"
            style={[styles.title, styles.growingTitle, { color: colors.text }]}
          >
            {example.title}
          </Text>
          <IconButton label="Fermer" onPress={onDismiss}>
            <Image
              source={require("../../assets/icons/close.svg")}
              style={styles.closeIcon}
              tintColor={colors.icon}
              contentFit="contain"
            />
          </IconButton>
        </View>
        <Text style={[styles.body, { color: colors.secondaryText }]}>
          {message}
        </Text>
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Nom du club</Text>
        <BottomSheetTextInput
          accessibilityLabel="Nom du club"
          value={name}
          onChangeText={setName}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.raised,
              borderColor: colors.border,
            },
          ]}
        />
      </View>
      <Paragraphs count={example.paragraphCount} />
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>
          Dernier champ
        </Text>
        <BottomSheetTextInput
          accessibilityLabel="Dernier champ"
          value={last}
          onChangeText={setLast}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.raised,
              borderColor: colors.border,
            },
          ]}
        />
      </View>
      <Button label="Confirmer" fullWidth onPress={onDismiss} />
    </BottomSheetScrollView>
  );
}

/** Supplies identical filler content so both presentations exercise the same content length. */
function Paragraphs({ count }: { count: number }) {
  const { colors } = useTheme();
  return Array.from({ length: count }, (_, index) => (
    <Text key={index} style={[styles.body, { color: colors.text }]}>
      Paragraphe {index + 1}. Le contenu doit défiler pour atteindre le dernier
      champ et la confirmation.
    </Text>
  ));
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.section },
  title: tokens.typography.heading,
  growingTitle: { flex: 1 },
  introduction: { gap: tokens.spacing.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  closeIcon: { width: tokens.size.actionIcon, height: tokens.size.actionIcon },
  body: tokens.typography.body,
  field: { gap: tokens.spacing.label },
  label: tokens.typography.label,
  input: {
    ...tokens.typography.body,
    minHeight: tokens.size.control,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.control,
    padding: tokens.spacing.md,
  },
});
