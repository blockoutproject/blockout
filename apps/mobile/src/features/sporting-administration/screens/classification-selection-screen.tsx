import {
  sportingGenderLabels,
  formatLabel,
} from "../../sporting/classification-presentation";
import { useRouter } from "expo-router";
import { useWatch } from "react-hook-form";
import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { Sheet } from "../../../shared/components/sheet";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useAccountSession } from "../../accounts/current-account";
import { useDivisions, type ClassificationTarget } from "../api/classification";
import { findClassificationEditor } from "../forms/classification-editor";

/** A native short sheet edits the parent's existing RHF control; it adds no callback registry or second draft. */
export function ClassificationSelectionScreen({
  target,
  field,
}: {
  target: ClassificationTarget;
  field: "divisionId" | "gender" | "format";
}) {
  const session = useAccountSession();
  const editor = findClassificationEditor(session.generation, target);
  return editor ? (
    <Selection editor={editor} field={field} />
  ) : (
    <RequestError message="Ouvrez la classification avant de choisir une valeur." />
  );
}
/** Selected/disabled states follow the current draft and grants, while only active divisions are assignable. */
function Selection({
  editor,
  field,
}: {
  editor: NonNullable<ReturnType<typeof findClassificationEditor>>;
  field: "divisionId" | "gender" | "format";
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const divisions = useDivisions();
  const value = useWatch({ control: editor.form.control, name: field });
  const label =
    field === "divisionId"
      ? "Division"
      : field === "gender"
        ? "Genre"
        : "Format";
  const choices =
    field === "divisionId"
      ? (divisions.query.data?.items
          .filter((item) => item.active)
          .map((item) => ({ value: item.id, label: item.name })) ?? [])
      : field === "gender"
        ? [
            { value: "female", label: sportingGenderLabels.female },
            { value: "male", label: sportingGenderLabels.male },
            { value: "mixed", label: sportingGenderLabels.mixed },
          ]
        : [
            { value: "6x6", label: formatLabel("6x6") },
            { value: "4x4", label: formatLabel("4x4") },
            { value: "2x2", label: formatLabel("2x2") },
          ];
  const disabled =
    divisions.authority.permissions?.manageSportingClassification !== true;
  return (
    <Sheet title={label} onClose={() => router.back()}>
      {field === "divisionId" && divisions.query.isPending && (
        <RequestLoading />
      )}
      {field === "divisionId" && divisions.query.isError && (
        <RequestError
          message="Les divisions sont indisponibles."
          onRetry={() => void divisions.query.refetch()}
          retrying={divisions.query.isFetching}
        />
      )}
      {choices.map((choice) => (
        <Pressable
          key={choice.value}
          accessibilityRole="radio"
          accessibilityLabel={choice.label}
          accessibilityState={{ checked: choice.value === value, disabled }}
          disabled={disabled}
          onPress={() => {
            editor.form.setValue(field, choice.value, {
              shouldDirty: true,
              shouldValidate: true,
            });
            router.back();
          }}
          style={({ pressed }) => [
            styles.option,
            {
              borderColor: colors.border,
              opacity: disabled
                ? tokens.opacity.disabled
                : pressed
                  ? tokens.opacity.pressed
                  : 1,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>
            {choice.label}
          </Text>
          {choice.value === value ? (
            <Check
              accessible={false}
              size={tokens.size.controlIcon}
              color={colors.icon}
            />
          ) : (
            <View style={styles.icon} />
          )}
        </Pressable>
      ))}
    </Sheet>
  );
}
const styles = StyleSheet.create({
  option: {
    minHeight: tokens.size.control,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: tokens.borderWidth,
  },
  label: { ...tokens.typography.strong, flex: 1 },
  icon: { width: tokens.size.controlIcon },
});
