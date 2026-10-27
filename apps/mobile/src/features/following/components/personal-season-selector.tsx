import { useState } from "react";
import { ChevronDown } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { FollowOptionsResponse } from "../../../../.generated/schemas/index.zod";
import { Sheet } from "../../../shared/components/sheet";
import { Button } from "../../../shared/components/button";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useReducedMotion } from "../../../shared/theme/use-reduced-motion";

/** Controlled personal-space choice; only successful options supply years and the proposed reset. */
export interface PersonalSeasonSelectorProps {
  options?: FollowOptionsResponse;
  seasonId?: string;
  onSelect: (seasonId: string | undefined) => void;
  onReset: () => void;
  disabled?: boolean;
  /** Explicit opening may refresh choices while retaining the previous successful options. */
  onOpen?: () => void;
}

/** UI Library 3176:2823 compact pill with a native modal choice surface and platform touch target. */
export function PersonalSeasonSelector({
  options,
  seasonId,
  onSelect,
  onReset,
  disabled = false,
  onOpen,
}: PersonalSeasonSelectorProps) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  // A suspended control cannot reopen its former modal when access returns.
  if (disabled && open) setOpen(false);
  const label = !options
    ? "Saison"
    : (options.seasons.find((season) => season.id === seasonId)?.label ??
      (seasonId ? "Saison" : "Toutes saisons"));
  const proposed = options?.seasons.find(
    (season) => season.id === options.defaultSeasonId,
  );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Saison des suivis"
        accessibilityValue={{ text: label }}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          setOpen(true);
          onOpen?.();
        }}
        style={({ pressed }) => [
          styles.target,
          {
            opacity: disabled
              ? tokens.opacity.disabled
              : pressed
                ? tokens.opacity.pressed
                : 1,
          },
        ]}
      >
        <View
          style={[
            styles.pill,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              tokens.typography.label,
              { color: colors.text, flexShrink: 1 },
            ]}
          >
            {label}
          </Text>
          <ChevronDown
            accessible={false}
            size={tokens.size.icon.sm}
            color={colors.icon}
          />
        </View>
      </Pressable>
      <Modal
        visible={open && !disabled}
        presentationStyle="pageSheet"
        allowSwipeDismissal
        backdropColor={colors.surface}
        animationType={reducedMotion ? "none" : "slide"}
        onRequestClose={() => setOpen(false)}
        onDismiss={() => setOpen(false)}
      >
        <Sheet title="Saison des suivis" onClose={() => setOpen(false)}>
          {options?.seasons.map((season) => (
            <SeasonChoice
              key={season.id}
              label={season.label}
              selected={season.id === seasonId}
              onPress={() => {
                onSelect(season.id);
                setOpen(false);
              }}
            />
          ))}
          <SeasonChoice
            label="Toutes les saisons"
            selected={seasonId === undefined}
            onPress={() => {
              onSelect(undefined);
              setOpen(false);
            }}
          />
          {proposed && proposed.id !== seasonId && (
            <Button
              variant="secondary"
              label={`Revenir à la saison proposée (${proposed.label})`}
              onPress={() => {
                onReset();
                setOpen(false);
              }}
            />
          )}
        </Sheet>
      </Modal>
    </>
  );
}

/** Presents each actual season as a native accessible radio choice without a shadow form state. */
function SeasonChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, membership } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? membership.fill : colors.surface,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <Text
        style={[
          tokens.typography.strong,
          { color: selected ? membership.content : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  target: {
    minHeight: tokens.touch.minimum,
    justifyContent: "center",
    maxWidth: "50%",
  },
  pill: {
    minHeight: 34,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  choice: {
    minHeight: tokens.touch.minimum,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.control,
    justifyContent: "center",
  },
});
