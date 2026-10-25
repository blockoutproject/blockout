import {
  Controller,
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TextField } from "../../../shared/components/text-field";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import type { PresentationValues } from "../forms/presentation-values";
import {
  automaticDivisionGradient,
  divisionTextColor,
} from "./division-colors";

/** Product Design 1368:10291: two color cards, using the existing RHF draft and native HEX inputs. */
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
  const primary = /^#[0-9a-fA-F]{6}$/.test(color) ? color : colors.subtle;
  const custom = gradient.some((value) => value !== "");
  const stops: PresentationValues["gradient"] = custom
    ? gradient
    : [color, color, color];
  const validStops = stops.every((value) => /^#[0-9a-fA-F]{6}$/.test(value));
  const card = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ];
  return (
    <>
      <View style={card}>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Couleur principale
        </Text>
        <View style={styles.colorRow}>
          <View style={[styles.colorSwatch, { backgroundColor: primary }]} />
          <View style={styles.field}>
            <Controller
              control={control}
              name="color"
              render={({ field, fieldState }) => (
                <TextField
                  ref={field.ref}
                  label="Couleur HEX"
                  labelStyle={[
                    tokens.typography.metadata,
                    { color: colors.secondaryText },
                  ]}
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
          </View>
        </View>
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
                    color: index === 2 ? colors.text : divisionTextColor(color),
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Texte blanc ou noir automatique sur les aplats.
        </Text>
      </View>
      <View style={card}>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Dégradé
        </Text>
        <View
          style={[
            styles.preview,
            {
              backgroundColor: primary,
              backgroundImage:
                custom && validStops
                  ? `linear-gradient(90deg, ${stops.join(", ")})`
                  : automaticDivisionGradient,
            },
          ]}
        >
          <View style={[styles.mode, { backgroundColor: colors.overlayScrim }]}>
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
            <View key={label} style={styles.field}>
              <View
                style={[
                  styles.stopSwatch,
                  {
                    backgroundColor: /^#[0-9a-fA-F]{6}$/.test(stops[index])
                      ? stops[index]
                      : colors.subtle,
                    borderColor: colors.border,
                  },
                ]}
              />
              <Controller
                control={control}
                name={`gradient.${index}`}
                render={({ field, fieldState }) => (
                  <TextField
                    ref={field.ref}
                    label={label}
                    labelStyle={[
                      tokens.typography.metadata,
                      { color: colors.secondaryText, textAlign: "center" },
                    ]}
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
                    style={styles.stopInput}
                  />
                )}
              />
            </View>
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
          style={[styles.action, disabled && styles.disabled]}
        >
          <Text style={[tokens.typography.metadata, { color: colors.text }]}>
            {custom
              ? "Revenir au dégradé automatique"
              : "Utiliser ces trois teintes"}
          </Text>
          <ChevronRight accessible={false} size={16} color={colors.icon} />
        </Pressable>
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          La teinte de fin sert aussi de couleur secondaire.
        </Text>
      </View>
    </>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.spacing.md,
  },
  field: { flex: 1, minWidth: 0, gap: tokens.spacing.sm },
  colorSwatch: {
    width: tokens.size.control,
    height: tokens.size.control,
    borderRadius: tokens.radius.control,
  },
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
  },
  mode: {
    alignSelf: "flex-start",
    borderRadius: tokens.radius.badge,
    padding: tokens.spacing.xs,
  },
  stops: { flexDirection: "row", gap: tokens.spacing.sm },
  stopSwatch: {
    height: tokens.size.control,
    borderRadius: tokens.radius.control,
    borderWidth: tokens.borderWidth,
  },
  stopInput: {
    ...tokens.typography.metadata,
    textAlign: "center",
    paddingHorizontal: tokens.spacing.xs,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
    minHeight: tokens.size.control,
  },
  disabled: { opacity: tokens.opacity.disabled },
});
