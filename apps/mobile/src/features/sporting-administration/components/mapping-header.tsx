import { useRouter } from "expo-router";
import { Flag } from "lucide-react-native";
import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { supportHref } from "@/features/support";
import { IconButton } from "@/shared/components/icon-button";
import { PageHeader } from "@/shared/components/page-header";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

export function MappingHeader({
  title = "Mapping des poules",
  subtitle,
}: Readonly<{ title?: string; subtitle?: string }>) {
  const { ordinary } = useAccessAdmission();
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      action={
        ordinary && (
          <IconButton
            label="Signaler un problème"
            onPress={() => router.push(supportHref({ screen: "pool-mapping" }))}
          >
            <Flag
              accessible={false}
              size={tokens.size.icon.lg}
              color={colors.icon}
            />
          </IconButton>
        )
      }
    />
  );
}
