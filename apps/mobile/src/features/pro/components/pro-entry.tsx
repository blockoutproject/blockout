import { RoundedContainedImage } from "@/shared/components/rounded-contained-image";
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
  const open = useOpenProPaywall();
  const account = useAccountSession();
  const router = useRouter();
  const session = account;
  const guest = account.status === "guest";
  const available =
    guest || (account.status === "authenticated" && session.accountId !== null);
  return (
    <EntryRow
      label="Blockout Pro"
      disabled={!available}
      icon={
        <RoundedContainedImage
          accessible={false}
          source={require("../../../../assets/accounts/pro.png")}
          style={styles.icon}
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

/** Shows only current SDK-established membership; unknown rights never imply a free account. */
export function ProProfileBadge() {
  const { state } = usePro();
  const { colors, membership } = useTheme();
  if (state.status !== "active" && state.status !== "inactive") {
    return null;
  }
  const active = state.status === "active";
  return (
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
        {active ? "Compte Pro" : "Compte gratuit"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: tokens.size.icon.md,
    height: tokens.size.icon.md,
    borderRadius: tokens.media.radius.compact,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
});
