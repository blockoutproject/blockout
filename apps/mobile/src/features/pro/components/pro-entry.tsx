import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAccountSession } from "@/features/accounts/current-account";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { EntryRow } from "@/shared/components/entry-row";
import { usePro } from "../pro-provider";
import { useOpenProPaywall } from "../use-open-pro-paywall";

/** Keeps the shared guest invitation; connected entries use the existing native Pro owner. */
export function ProEntry() {
  const { colors, membership } = useTheme();
  const { state } = usePro();
  const open = useOpenProPaywall();
  const account = useAccountSession();
  const router = useRouter();
  const guest = account.status === "guest";
  const available =
    guest || (account.status === "authenticated" && account.accountId !== null);
  const active = state.status === "active";
  const membershipLabel =
    active || state.status === "inactive"
      ? active
        ? "Compte Pro"
        : "Compte gratuit"
      : undefined;
  return (
    <EntryRow
      label="Blockout Pro"
      disabled={!available}
      accessibilityValue={
        membershipLabel ? { text: membershipLabel } : undefined
      }
      labelAccessory={
        membershipLabel && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: active ? membership.fill : colors.subtle,
                borderColor: active ? membership.border : colors.border,
              },
            ]}
          >
            <Text
              style={[
                tokens.typography.metadata,
                { color: active ? membership.content : colors.secondaryText },
              ]}
            >
              {membershipLabel}
            </Text>
          </View>
        )
      }
      icon={
        <Image
          accessible={false}
          source={require("../../../../assets/accounts/pro.png")}
          contentFit="contain"
          style={[styles.icon, { backgroundColor: colors.mediaPlaceholder }]}
        />
      }
      onPress={() => {
        if (guest) {
          router.push("/sign-in-invitation");
        } else {
          void open();
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    width: tokens.size.icon.md,
    height: tokens.size.icon.md,
    borderRadius: tokens.media.radius.compact,
  },
  badge: {
    flexShrink: 1,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
});
