import { ShieldCheck } from "lucide-react-native";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { EntryRow } from "@/shared/components/entry-row";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

type AdvertisingChoicesEntryProps = {
  pending: boolean;
  showPrivacyOptions(): Promise<void>;
};

/** Opens the provider's privacy options form directly from Profile. */
export function AdvertisingChoicesEntry({
  pending,
  showPrivacyOptions,
}: Readonly<AdvertisingChoicesEntryProps>) {
  const { colors } = useTheme();
  const feedback = useActionFeedback();

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
      disabled={pending}
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
