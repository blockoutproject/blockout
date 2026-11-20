import { ShieldCheck } from "lucide-react-native";
import { useAdvertising } from "@/features/advertising/advertising-provider";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { EntryRow } from "@/shared/components/entry-row";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

/** Opens the provider's form from Profile when UMP requires a privacy entry point. */
export function AdvertisingChoicesEntry() {
  const { privacyOptionsRequired, privacyOptionsPending, showPrivacyOptions } =
    useAdvertising();
  const { colors } = useTheme();
  const feedback = useActionFeedback();

  if (!privacyOptionsRequired) {
    return null;
  }

  async function openChoices() {
    feedback.clear();
    try {
      await showPrivacyOptions();
    } catch {
      feedback.error(
        "Impossible de mettre à jour vos choix publicitaires. Réessayez.",
      );
    }
  }

  return (
    <EntryRow
      label="Choix publicitaires"
      disclosure
      disabled={privacyOptionsPending}
      onPress={() => void openChoices()}
      icon={
        <ShieldCheck
          accessible={false}
          size={tokens.size.icon.md}
          color={colors.icon}
        />
      }
    />
  );
}
