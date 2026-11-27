import { Controller, type UseFormReturn } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Surface } from "@/shared/components/surface";
import { TextField } from "@/shared/components/text-field";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import type { ClubContacts } from "../api/club-contacts";
import type { PresentationValues } from "../schemas/presentation-schema";
import { clubContactKeys, clubContactLabels } from "./club-contact-values";

interface ClubContactFieldsProps {
  form: UseFormReturn<PresentationValues>;
  current: ClubContacts;
  disabled: boolean;
}

/** Direct edits change the field's mode. Source hints never use a superseded read. */
export function ClubContactFields({
  form,
  current,
  disabled,
}: Readonly<ClubContactFieldsProps>) {
  const { colors } = useTheme();
  return (
    <Surface style={styles.fields}>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.headingSm, { color: colors.secondaryText }]}
      >
        Coordonnées
      </Text>
      {clubContactKeys.map((key) => {
        const original = current[key].sourceValue ?? "";
        const label = clubContactLabels[key];
        const name = `contacts.${key}` as const;
        return (
          <Controller
            key={key}
            name={name}
            control={form.control}
            render={({ field, fieldState }) => {
              const draftMode = field.value?.mode ?? "keep";
              const mode = draftMode === "keep" ? current[key].mode : draftMode;
              const value =
                draftMode === "keep"
                  ? (current[key].effectiveValue ?? "")
                  : draftMode === "source"
                    ? original
                    : (field.value?.value ?? "");
              const hint = original || "Non renseigné";
              const action =
                mode !== "source"
                  ? "Reprendre FFvolley"
                  : !original
                    ? "Laisser vide"
                    : undefined;
              return (
                <View style={styles.field}>
                  <TextField
                    ref={field.ref}
                    label={label}
                    value={value}
                    helper={mode === "hidden" ? `Laissé vide · ${hint}` : hint}
                    error={fieldState.error?.message}
                    onBlur={field.onBlur}
                    onChangeText={(text) =>
                      field.onChange({
                        mode: text.trim() ? "manual" : "hidden",
                        value: text,
                      })
                    }
                    editable={!disabled}
                    autoCapitalize={
                      key === "email" || key === "website"
                        ? "none"
                        : "sentences"
                    }
                    keyboardType={
                      key === "email"
                        ? "email-address"
                        : key === "website"
                          ? "url"
                          : key === "phone"
                            ? "phone-pad"
                            : "default"
                    }
                  />
                  {action && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${action} pour ${label}`}
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() => {
                        if (mode === "source") {
                          field.onChange({ mode: "hidden", value: "" });
                        } else if (current[key].mode === "source") {
                          form.resetField(name);
                        } else {
                          field.onChange({ mode: "source", value: original });
                        }
                      }}
                      style={styles.action}
                    >
                      <Text
                        style={[
                          tokens.typography.metadata,
                          styles.link,
                          { color: colors.text },
                        ]}
                      >
                        {action}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            }}
          />
        );
      })}
    </Surface>
  );
}

const styles = StyleSheet.create({
  fields: { gap: tokens.layout.form.gap },
  field: { gap: tokens.spacing.xs },
  action: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: tokens.touch.minimum,
  },
  link: { textDecorationLine: "underline" },
});
