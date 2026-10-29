import { useRouter } from "expo-router";
import { Flag } from "lucide-react-native";
import { IconButton } from "../../../shared/components/icon-button";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { supportHref } from "../../support";

/** Shared profile header action opens the existing support sheet without removing the underlying editor or its draft. */
export function ProfileSupportAction() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <IconButton
      label="Besoin d’aide ?"
      onPress={() => router.push(supportHref({ screen: "profile" }))}
    >
      <Flag accessible={false} size={tokens.size.icon.lg} color={colors.icon} />
    </IconButton>
  );
}
