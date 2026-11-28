import { useRouter } from "expo-router";
import { Flag } from "lucide-react-native";
import { IconButton } from "@/shared/components/icon-button";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { supportHref, type SupportOrigin } from "../model/support-context";
import { supportKindLabels } from "../model/support-presentation";

export function SupportFlagAction({
  origin,
  label = supportKindLabels.problem,
  beforeOpen,
}: Readonly<{
  origin: SupportOrigin;
  label?: string;
  beforeOpen?: () => void;
}>) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <IconButton
      label={label}
      onPress={() => {
        beforeOpen?.();
        router.push(supportHref(origin));
      }}
    >
      <Flag accessible={false} size={tokens.size.icon.lg} color={colors.icon} />
    </IconButton>
  );
}
