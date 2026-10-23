import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAccountSession } from "../../accounts/current-account";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Profile command supplied by the native host owner; guests always take the ordinary F05 invitation. */
export interface ProEntryProps {
  onOpenPresentation: () => void;
}

/** Profile action only; native offering selection, entitlement presentation and operations remain T025-owned. */
export function ProEntry({ onOpenPresentation }: ProEntryProps) {
  const account = useAccountSession();
  const router = useRouter();
  const { colors } = useTheme();
  const session = account.getSnapshot();
  const guest = account.status === "guest";
  const available =
    guest || (account.status === "authenticated" && session.accountId !== null);

  return (
    <View style={styles.group}>
      <Text style={[tokens.typography.label, { color: colors.secondaryText }]}>
        Mon compte
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Blockout Pro"
        accessibilityState={{ disabled: !available }}
        disabled={!available}
        onPress={() => {
          if (!account.isCurrent(session.generation)) return;
          if (guest) router.push("/sign-in-invitation");
          else onOpenPresentation();
        }}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: colors.raised,
            borderColor: colors.border,
            opacity: pressed ? tokens.opacity.pressed : 1,
          },
        ]}
      >
        <Image
          accessible={false}
          source={require("../../../../assets/accounts/pro.png")}
          style={styles.icon}
          contentFit="contain"
        />
        <Text style={[styles.label, { color: colors.text }]}>Blockout Pro</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    padding: tokens.spacing.lg,
    minHeight: tokens.touchTarget.android,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
  },
  icon: {
    width: tokens.size.actionIcon,
    height: tokens.size.actionIcon,
    borderRadius: tokens.radius.control / 2,
  },
  label: { ...tokens.typography.strong, flex: 1 },
});
