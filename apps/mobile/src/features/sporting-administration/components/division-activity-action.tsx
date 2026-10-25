import { useEffect, useRef } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import type { DivisionResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import type { useDivisionActivity } from "../api/classification";

/** The existing editor owns revision/recovery; this action owns only the independent lifecycle request. */
export interface DivisionActivityActionProps {
  division: DivisionResponse;
  editing: ReturnType<typeof useDivisionActivity>;
  disabled: boolean;
  onAccepted: (division: DivisionResponse) => void;
  onFailure: (error: unknown) => void;
}

/** Product Design 1368:10291 places the confirmed lifecycle command after the presentation save. */
export function DivisionActivityAction({
  division,
  editing,
  disabled,
  onAccepted,
  onFailure,
}: DivisionActivityActionProps) {
  const { colors } = useTheme();
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  if (editing.authority.permissions?.manageDivisionLifecycle !== true)
    return null;
  const busy = disabled || !editing.authority.enabled || editing.saving;
  /** Rechecks current authority through the generated mutation after the native confirmation. */
  async function save() {
    if (!mounted.current || busy) return;
    try {
      onAccepted(
        await editing.save.mutateAsync({
          revision: division.revision,
          active: !division.active,
        }),
      );
    } catch (error) {
      if (
        editing.authority.session.isCurrent(
          editing.authority.session.generation,
        )
      )
        onFailure(error);
    }
  }
  const label = division.active
    ? "Désactiver la division"
    : "Réactiver la division";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy: editing.saving }}
      disabled={busy}
      onPress={() =>
        Alert.alert(
          `${label} ?`,
          division.active
            ? "Les poules, équipes et matchs seront masqués sans effacer leur historique. La collecte s’arrêtera selon ses règles habituelles."
            : "Seule l’inactivité sera levée. Les autres restrictions de visibilité et de collecte restent applicables.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Confirmer", onPress: () => void save() },
          ],
        )
      }
      style={[styles.action, busy && styles.disabled]}
    >
      <Text
        style={[
          styles.label,
          { color: division.active ? colors.error : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  action: {
    minHeight: tokens.size.control,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...tokens.typography.metadata, textDecorationLine: "underline" },
  disabled: { opacity: tokens.opacity.disabled },
});
