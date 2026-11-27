import { Controller, type UseFormReturn } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Surface } from "@/shared/components/surface";
import { TextField, type TextFieldProps } from "@/shared/components/text-field";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import type { ClubContacts } from "../api/club-contacts";
import type { PresentationValues } from "../schemas/presentation-schema";
import { clubContactKeys, type ClubContactKey } from "./club-contact-values";

interface ClubContactFieldsProps {
  form: Pick<UseFormReturn<PresentationValues>, "control" | "resetField">;
  current: ClubContacts;
  disabled: boolean;
}

const contactInputs: Record<
  ClubContactKey,
  Pick<TextFieldProps, "label" | "keyboardType" | "autoCapitalize">
> = {
  address: { label: "Adresse" },
  city: { label: "Commune" },
  postalCode: { label: "Code postal" },
  email: {
    label: "Adresse e-mail",
    keyboardType: "email-address",
    autoCapitalize: "none",
  },
  phone: { label: "Téléphone", keyboardType: "phone-pad" },
  website: { label: "Site web", keyboardType: "url", autoCapitalize: "none" },
};

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
        const contact = current[key];
        const original = contact.sourceValue ?? "";
        const input = contactInputs[key];
        const name = `contacts.${key}` as const;
        return (
          <Controller
            key={key}
            name={name}
            control={form.control}
            render={({ field, fieldState }) => {
              const draftMode = field.value?.mode ?? "keep";
              const mode = draftMode === "keep" ? contact.mode : draftMode;
              const value =
                draftMode === "keep"
                  ? (contact.effectiveValue ?? "")
                  : draftMode === "source"
                    ? original
                    : (field.value?.value ?? "");
              const hint = original || "Non renseigné";
              const fromSource = mode === "source";
              const action = fromSource ? "Laisser vide" : "Reprendre FFvolley";
              return (
                <View style={styles.field}>
                  <TextField
                    ref={field.ref}
                    autoCapitalize="sentences"
                    {...input}
                    value={value}
                    helper={mode === "hidden" ? `Laissé vide · ${hint}` : hint}
                    error={fieldState.error?.message}
                    onBlur={field.onBlur}
                    onChangeText={(text) => {
                      if (
                        (contact.mode === "manual" &&
                          text === contact.manualValue) ||
                        (contact.mode === "hidden" && text === "")
                      ) {
                        form.resetField(name);
                        return;
                      }
                      field.onChange({
                        mode: text.trim() ? "manual" : "hidden",
                        value: text,
                      });
                    }}
                    editable={!disabled}
                  />
                  {(!fromSource || !original) && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${action} pour ${input.label}`}
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() => {
                        if (fromSource) {
                          field.onChange({ mode: "hidden", value: "" });
                        } else if (contact.mode === "source") {
                          form.resetField(name);
                        } else {
                          field.onChange({ mode: "source", value: "" });
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
