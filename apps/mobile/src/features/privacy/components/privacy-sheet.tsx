import { Link, useRouter } from "expo-router";
import { ShieldCheck, SquarePen } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Sheet } from "../../../shared/components/sheet";
import { Surface } from "../../../shared/components/surface";
import { EntryRow } from "../../../shared/components/entry-row";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useAgeDeclaration } from "../../advertising/age-declaration-provider";

/** Profile entry is available to guests and Pro under the caller's ordinary F12 admission. */
export function PrivacyEntry() {
  const { colors } = useTheme();
  return (
    <Link href="/privacy" asChild>
      <EntryRow
        label="Confidentialité"
        icon={
          <ShieldCheck
            accessible={false}
            size={tokens.size.icon.md}
            color={colors.icon}
          />
        }
      />
    </Link>
  );
}

/** Two approved actions only; native UMP owns availability, consent persistence and its own form. */
export function PrivacySheet() {
  const router = useRouter();
  const { privacy, nativePrivacy, pending } = useAgeDeclaration();
  const feedback = useActionFeedback();
  const { colors } = useTheme();
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
          <EntryRow
            label="Choix publicitaires"
            icon={
              <ShieldCheck
                accessible={false}
                size={tokens.size.icon.lg}
                color={colors.icon}
              />
            }
            disclosure
            style={styles.sheetAction}
            disabled={nativePrivacy.pending || pending}
            onPress={openOptions}
          />
        )}
        <EntryRow
          label="Corriger mon âge"
          icon={
            <SquarePen
              accessible={false}
              size={tokens.size.icon.lg}
              color={colors.icon}
            />
          }
          disclosure
          style={styles.sheetAction}
          disabled={nativePrivacy.pending || pending}
          onPress={() => router.replace("/privacy-age")}
        />
      </Surface>
      {nativePrivacy.pending && <RequestLoading />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheetAction: { paddingHorizontal: tokens.spacing.lg },
});
