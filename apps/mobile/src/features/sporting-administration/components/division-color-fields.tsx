import {
  Controller,
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TextField } from "../../../shared/components/text-field";
import { Surface } from "../../../shared/components/surface";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import type { PresentationValues } from "../schemas/presentation-schema";
import { divisionTextColor } from "../../sporting/presentation";
import { DivisionPaint } from "../../sporting/components/division-paint";

/** Shared HEX fields retain the RHF draft; primary examples and the gradient preview display their colors. */
export function DivisionColorFields({
  control,
  setValue,
  disabled,
}: {
  control: Control<PresentationValues>;
  setValue: UseFormSetValue<PresentationValues>;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const color = useWatch({ control, name: "color" });
  const gradient = useWatch({ control, name: "gradient" });
  const validPrimary = /^#[0-9a-fA-F]{6}$/.test(color);
  const primary = validPrimary ? color : colors.subtle;
  const custom = gradient.some((value) => value !== "");
  const stops: PresentationValues["gradient"] = custom
    ? gradient
    : [color, color, color];
  const validStops = stops.every((value) => /^#[0-9a-fA-F]{6}$/.test(value));
  return (
    <>
      <Surface>
        <View style={styles.fields}>
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            Couleur principale
          </Text>
          <Controller
            control={control}
            name="color"
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label="Couleur HEX"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!disabled}
                error={fieldState.error?.message}
              />
            )}
          />
          <View style={styles.examples}>
            {["14:00", "Division", "Contour"].map((label, index) => (
              <View
                key={label}
                style={[
                  styles.badge,
                  {
                    borderColor: primary,
                    backgroundColor: index === 2 ? "transparent" : primary,
                  },
                ]}
              >
                <Text
                  style={[
                    tokens.typography.metadata,
                    {
                      color:
                        index === 2 || !validPrimary
                          ? colors.text
                          : divisionTextColor(primary),
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            Texte blanc ou noir automatique sur les aplats.
          </Text>
        </View>
      </Surface>
      <Surface>
        <View style={styles.fields}>
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            Dégradé
          </Text>
          <View style={styles.preview}>
            <DivisionPaint
              division={{
                color: primary,
                gradient: custom && validStops ? stops : null,
              }}
            />
            <View
              style={[styles.mode, { backgroundColor: colors.overlayScrim }]}
            >
              <Text
                style={[tokens.typography.metadata, { color: colors.onScrim }]}
              >
                {custom ? "Personnalisé" : "Automatique"}
              </Text>
            </View>
          </View>
          <View style={styles.stops}>
            {(
              [
                { label: "Départ", index: 0 },
                { label: "Milieu", index: 1 },
                { label: "Fin", index: 2 },
              ] as const
            ).map(({ label, index }) => (
              <Controller
                key={label}
                control={control}
                name={`gradient.${index}`}
                render={({ field, fieldState }) => (
                  <TextField
                    ref={field.ref}
                    label={label}
                    value={custom ? field.value : color}
                    onChangeText={(value) => {
                      const next: PresentationValues["gradient"] = custom
                        ? [...gradient]
                        : [color, color, color];
                      next[index] = value;
                      setValue("gradient", next, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    onBlur={field.onBlur}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!disabled}
                    error={fieldState.error?.message}
                  />
                )}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            accessibilityState={{ disabled }}
            onPress={() =>
              setValue(
                "gradient",
                custom ? ["", "", ""] : [color, color, color],
                { shouldDirty: true, shouldValidate: true },
              )
            }
            style={({ pressed }) => [
              styles.action,
              {
                opacity: disabled
                  ? tokens.opacity.disabled
                  : pressed
                    ? tokens.opacity.pressed
                    : 1,
              },
            ]}
          >
            <Text
              numberOfLines={2}
              style={[styles.actionLabel, { color: colors.text }]}
            >
              {custom
                ? "Revenir au dégradé automatique"
                : "Utiliser ces trois teintes"}
            </Text>
            <ChevronRight
              accessible={false}
              size={tokens.size.inlineIcon}
              color={colors.icon}
            />
          </Pressable>
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            La teinte de fin sert aussi de couleur secondaire.
          </Text>
        </View>
      </Surface>
    </>
  );
}
const styles = StyleSheet.create({
  fields: { gap: tokens.spacing.lg },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  badge: {
    minHeight: 32,
    paddingHorizontal: tokens.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.badge,
    borderWidth: tokens.borderWidth,
  },
  preview: {
    height: 126,
    padding: tokens.spacing.md,
    justifyContent: "flex-end",
    borderRadius: tokens.radius.control,
    overflow: "hidden",
  },
  mode: {
    alignSelf: "flex-start",
    borderRadius: tokens.radius.badge,
    padding: tokens.spacing.xs,
  },
  stops: { gap: tokens.spacing.lg },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
    minHeight: tokens.size.control,
  },
  actionLabel: {
    ...tokens.typography.metadata,
    flexShrink: 1,
    textAlign: "center",
  },
});
