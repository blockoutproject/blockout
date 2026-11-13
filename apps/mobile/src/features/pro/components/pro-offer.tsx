import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BrandMark } from "@/shared/components/brand-mark";
import { useTheme } from "@/shared/theme/theme-provider";
import { membershipColors, tokens } from "@/shared/theme/tokens";
import { canPurchasePro } from "../pro-offering";
import { usePro } from "../pro-provider";

/**
 * Existing Pro offer pattern 5116:12765, composed only with visible bottom navigation.
 * Current eligible inactive SDK state permits this voluntary entry; no offering is read here.
 */
export function ProOffer() {
  const { state } = usePro();
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const premium = membershipColors.pro[scheme];
  if (!canPurchasePro(state)) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Blockout Pro, sans publicité"
      onPress={() => router.push("/pro")}
      style={({ pressed }) => [
        styles.offer,
        {
          backgroundColor: colors.surface,
          borderColor: premium.border,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <View style={styles.brand}>
        <BrandMark size={tokens.size.icon.lg} />
        <Text style={[tokens.typography.label, { color: colors.text }]}>
          Blockout
        </Text>
        <Text style={[tokens.typography.label, { color: premium.fill }]}>
          Pro
        </Text>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
      </View>
      <View style={styles.benefit}>
        <Text
          style={[
            tokens.typography.label,
            styles.benefitLabel,
            { color: colors.text },
          ]}
        >
          Sans publicité
        </Text>
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  offer: {
    minHeight: tokens.touch.minimum,
    marginHorizontal: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  separator: { width: tokens.border.thin, height: tokens.size.icon.md },
  benefit: {
    flexDirection: "row",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
  },
  benefitLabel: { flexShrink: 1, textAlign: "right" },
});
