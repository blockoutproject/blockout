import { Image } from "expo-image";
import { RefreshCw, SquarePen } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { IconButton } from "../../../shared/components/icon-button";
import { LoadingIndicator } from "../../../shared/components/loading-indicator";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useProfilePhoto } from "../api/use-profile-editing";

/** Accepted current identity only; the route supplies membership presentation and the independent edit destination. */
export interface ProfileIdentityProps {
  account: AccountResponse;
  disabled: boolean;
  membershipStatus?: ReactNode;
  onEdit: () => void;
}

/** Product Design 1131:1082 identity card; missing photos use current-account initials, never another account's image. */
export function ProfileIdentity({
  account,
  disabled,
  membershipStatus,
  onEdit,
}: ProfileIdentityProps) {
  const { colors } = useTheme();
  const photo = useProfilePhoto(
    account.accountId,
    !disabled && account.hasPhoto,
  );
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.raised, borderColor: colors.border },
      ]}
    >
      <View style={[styles.rail, { backgroundColor: colors.subtle }]}>
        <Image
          accessible={false}
          source={require("../../../../assets/accounts/profile-backdrop.png")}
          style={[
            styles.backdrop,
            { backgroundColor: colors.mediaPlaceholder },
          ]}
          contentFit="contain"
          enforceEarlyResizing
          blurRadius={8}
        />
        <View
          style={[styles.avatar, { backgroundColor: colors.mediaPlaceholder }]}
        >
          {account.hasPhoto && photo.data ? (
            <Image
              accessible
              accessibilityRole="image"
              accessibilityLabel="Photo de profil"
              source={{ uri: photo.data }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : account.hasPhoto && photo.isFetching ? (
            <LoadingIndicator color={colors.icon} />
          ) : account.hasPhoto && photo.isError ? (
            <IconButton
              label="Réessayer la photo de profil"
              onPress={() => void photo.refetch()}
              disabled={disabled}
            >
              <RefreshCw
                accessible={false}
                size={tokens.size.icon.md}
                color={colors.icon}
              />
            </IconButton>
          ) : (
            <Text style={[tokens.typography.heading, { color: colors.text }]}>
              {account.username.slice(0, 2).toUpperCase()}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.identity}>
        <View style={styles.actions}>
          {membershipStatus}
          <View style={styles.edit}>
            <IconButton
              label="Modifier mon profil"
              onPress={onEdit}
              disabled={disabled}
            >
              <SquarePen
                accessible={false}
                size={tokens.size.icon.lg}
                color={colors.icon}
              />
            </IconButton>
          </View>
        </View>
        <Text style={[tokens.typography.title, { color: colors.text }]}>
          {account.username}
        </Text>
        <Text
          style={[tokens.typography.label, { color: colors.secondaryText }]}
        >
          {account.email}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    minHeight: 162,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  rail: {
    width: 84,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  backdrop: {
    position: "absolute",
    width: 140,
    height: 140,
    top: 10,
    left: -28,
    opacity: 0.09,
    borderRadius: tokens.radius.panelInset,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.panelInset,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  identity: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    padding: tokens.spacing.compact,
    gap: tokens.spacing.sm,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  edit: { marginLeft: "auto" },
});
