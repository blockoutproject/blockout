import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { ChevronDown } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { FollowOptionsResponse } from "../../../../.generated/schemas/index.zod";
import { Sheet } from "../../../shared/components/sheet";
import { ApiError } from "../../../shared/api/api-fetch";
import {
  ActionFeedbackProvider,
  useActionFeedback,
} from "../../../shared/components/action-feedback";
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
  onOpen?: () => Promise<unknown>;
  /** Original interaction/session lifetime for the native modal feedback surface. */
  scopeKey?: string;
}

/** UI Library 3176:2823 compact pill with a native modal choice surface and platform touch target. */
export function PersonalSeasonSelector({
  options,
  seasonId,
  onSelect,
  onReset,
  disabled = false,
  onOpen,
  scopeKey = "personal-season",
}: PersonalSeasonSelectorProps) {
  const [open, setOpen] = useState(false);
  const sheet = useRef<SeasonSheetHandle>(null);
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  // A suspended control cannot reopen its former modal when access returns.
  if (disabled && open) setOpen(false);
  const label = !options
    ? "Saison"
    : (options.seasons.find((season) => season.id === seasonId)?.label ??
      (seasonId ? "Saison" : "Toutes saisons"));
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
        testID="personal-season-modal"
        visible={open && !disabled}
        presentationStyle="pageSheet"
        allowSwipeDismissal
        backdropColor={colors.surface}
        animationType={reducedMotion ? "none" : "slide"}
        onRequestClose={() => setOpen(false)}
        onDismiss={() => setOpen(false)}
        onShow={() => void sheet.current?.refresh()}
      >
        <ActionFeedbackProvider scopeKey={scopeKey}>
          <SeasonSheet
            ref={sheet}
            options={options}
            seasonId={seasonId}
            onSelect={onSelect}
            onReset={onReset}
            onOpen={onOpen}
            onClose={() => setOpen(false)}
          />
        </ActionFeedbackProvider>
      </Modal>
    </>
  );
}

/** Native Modal.onShow continues opening only after its own feedback surface is mounted. */
interface SeasonSheetHandle {
  refresh: () => Promise<void>;
}

/** Owns choices and opening feedback inside the native presentation, including Android's modal window. */
function SeasonSheet({
  ref,
  options,
  seasonId,
  onSelect,
  onReset,
  onOpen,
  onClose,
}: Pick<
  PersonalSeasonSelectorProps,
  "options" | "seasonId" | "onSelect" | "onReset" | "onOpen"
> & {
  ref: Ref<SeasonSheetHandle>;
  onClose: () => void;
}) {
  const feedback = useActionFeedback();
  useImperativeHandle(ref, () => ({
    /** The native opening event owns this fresh request; retained Query errors emit no feedback. */
    async refresh() {
      feedback.clear();
      try {
        await onOpen?.();
      } catch (error) {
        if (!(error instanceof ApiError && error.kind === "cancelled"))
          feedback.error();
      }
    },
  }));
  const proposed = options?.seasons.find(
    (season) => season.id === options.defaultSeasonId,
  );
  return (
    <Sheet title="Saison des suivis" onClose={onClose}>
      {options?.seasons.map((season) => (
        <SeasonChoice
          key={season.id}
          label={season.label}
          selected={season.id === seasonId}
          onPress={() => {
            onSelect(season.id);
            onClose();
          }}
        />
      ))}
      <SeasonChoice
        label="Toutes les saisons"
        selected={seasonId === undefined}
        onPress={() => {
          onSelect(undefined);
          onClose();
        }}
      />
      {proposed && proposed.id !== seasonId && (
        <Button
          variant="secondary"
          label={`Revenir à la saison proposée (${proposed.label})`}
          onPress={() => {
            onReset();
            onClose();
          }}
        />
      )}
    </Sheet>
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
