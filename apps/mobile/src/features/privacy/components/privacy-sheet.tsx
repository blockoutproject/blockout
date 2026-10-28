import { Link, useRouter } from "expo-router";
import {
  ChevronRight,
  ShieldCheck,
  SquarePen,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { Sheet } from "../../../shared/components/sheet";
import { Surface } from "../../../shared/components/surface";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useAgeDeclaration } from "../../advertising/age-declaration-provider";

/** Whole-row native action; common icons and tokens retain aligned labels and disclosure. */
function PrivacyAction({
  label,
  icon: Icon,
  ...props
}: PressableProps & { label: string; icon: LucideIcon }) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: props.disabled ?? false }}
      style={({ pressed }) => [
        styles.action,
        {
          opacity: props.disabled
            ? tokens.opacity.disabled
            : pressed
              ? tokens.opacity.pressed
              : 1,
        },
      ]}
    >
      <Icon accessible={false} size={tokens.size.icon.lg} color={colors.icon} />
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <ChevronRight
        accessible={false}
        size={tokens.size.icon.sm}
        color={colors.icon}
      />
    </Pressable>
  );
}

/** Profile entry is available to guests and Pro under the caller's ordinary F12 admission. */
export function PrivacyEntry() {
  return (
    <Surface>
      <Link href="/privacy" asChild>
        <PrivacyAction label="Confidentialité" icon={ShieldCheck} />
      </Link>
    </Surface>
  );
}

/** Two approved actions only; native UMP owns availability, consent persistence and its own form. */
export function PrivacySheet() {
  const router = useRouter();
  const { privacy, nativePrivacy, pending } = useAgeDeclaration();
  const feedback = useActionFeedback();
  useEffect(() => {
    void privacy.refreshOptions();
  }, [privacy]);

  /** Keeps action errors on the shared original-scope toast; native state alone owns retry admission. */
  function openOptions() {
    const attempt = privacy.showOptions();
    if (!attempt) return;
    feedback.clear();
    void attempt.catch(() =>
      feedback.error(
        "Impossible de mettre à jour vos choix publicitaires. Réessayez.",
      ),
    );
  }

  return (
    <Sheet
      title="Confidentialité"
      onClose={() => router.back()}
      scrollable={false}
    >
      <Surface>
        {nativePrivacy.privacyOptionsRequired && (
          <PrivacyAction
            label="Choix publicitaires"
            icon={ShieldCheck}
            disabled={nativePrivacy.pending || pending}
            onPress={openOptions}
          />
        )}
        <PrivacyAction
          label="Corriger mon âge"
          icon={SquarePen}
          disabled={nativePrivacy.pending || pending}
          onPress={() => router.replace("/privacy-age")}
        />
      </Surface>
      {nativePrivacy.pending && <RequestLoading />}
    </Sheet>
  );
}
const styles = StyleSheet.create({
  action: {
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
  },
  label: { ...tokens.typography.strong, flex: 1 },
});
