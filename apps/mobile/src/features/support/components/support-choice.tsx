import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useWatch } from "react-hook-form";
import { Pressable, StyleSheet, Text } from "react-native";
import {
  SupportRequestKindEnum,
  SupportRequestSubjectEnum,
} from "../../../../.generated/schemas/index.zod";
import { Sheet } from "../../../shared/components/sheet";
import { ErrorState } from "../../../shared/components/state-card";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useSupportVisit } from "../forms/support-visit";
import {
  supportKindLabels,
  supportSubjectLabels,
} from "../model/support-presentation";

/** Untrusted route field; only the form's kind and optional subject have a choice journey. */
export interface SupportChoiceProps {
  field?: unknown;
}

/** Edits the same RHF draft behind the native sheet; closing or selecting never abandons the form. */
export function SupportChoice({ field }: SupportChoiceProps) {
  const { form } = useSupportVisit();
  const values = useWatch({ control: form.control });
  const router = useRouter();
  const { colors } = useTheme();
  if (field !== "kind" && field !== "subject")
    return (
      <Sheet title="Assistance" onClose={() => router.back()}>
        <ErrorState />
      </Sheet>
    );
  const choices = Object.entries(
    field === "kind" ? supportKindLabels : supportSubjectLabels,
  );
  return (
    <Sheet
      title={field === "kind" ? "Nature de la demande" : "Sujet (facultatif)"}
      onClose={() => router.back()}
    >
      {choices.map(([value, label]) => (
        <Pressable
          key={value}
          accessibilityRole="radio"
          accessibilityLabel={label}
          accessibilityState={{ checked: values[field] === value }}
          onPress={() => {
            if (field === "kind")
              form.setValue(field, SupportRequestKindEnum.parse(value), {
                shouldDirty: true,
                shouldTouch: true,
              });
            else
              form.setValue(
                field,
                value === "" ? "" : SupportRequestSubjectEnum.parse(value),
                { shouldDirty: true, shouldTouch: true },
              );
            router.back();
          }}
          style={({ pressed }) => [
            styles.option,
            {
              borderColor: colors.border,
              opacity: pressed ? tokens.opacity.pressed : 1,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          {values[field] === value && (
            <Check
              accessible={false}
              size={tokens.size.icon.md}
              color={colors.icon}
            />
          )}
        </Pressable>
      ))}
    </Sheet>
  );
}
const styles = StyleSheet.create({
  option: {
    minHeight: tokens.size.control.default,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: tokens.border.thin,
  },
  label: { ...tokens.typography.strong, flex: 1 },
});
