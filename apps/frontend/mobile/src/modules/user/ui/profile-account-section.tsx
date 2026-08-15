import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  fontWeight,
  letterSpacing,
  spacing,
  typography,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
import { Action } from "@/src/shared/ui/action";
import ProfileVersion from "./profile-version";

type ProfileAccountSectionProps = {
  busy: boolean;
  isLoggingOut: boolean;
  isDeleting: boolean;
  onLogout: () => void;
  onDeleteAccount: () => void;
};

const ProfileAccountSection = ({
  busy,
  isLoggingOut,
  isDeleting,
  onLogout,
  onDeleteAccount,
}: ProfileAccountSectionProps) => {
  const theme = useAppTheme();

  return (
    <View style={styles.section}>
      <Text
        style={[styles.sectionTitle, { color: withAlpha(theme.text, 0.7) }]}
      >
        Compte
      </Text>

      <View style={styles.actions}>
        <Action
          label="Se déconnecter"
          loadingLabel="Déconnexion…"
          variant="destructive"
          onPress={onLogout}
          disabled={busy}
          loading={isLoggingOut}
          fullWidth
          style={styles.profileAction}
          accessibilityLabel="Se déconnecter"
          testID="profile-sign-out-action"
        />

        <Action
          label="Supprimer mon compte"
          loadingLabel="Suppression…"
          variant="destructiveOutline"
          onPress={onDeleteAccount}
          disabled={busy}
          loading={isDeleting}
          fullWidth
          style={styles.profileAction}
          accessibilityLabel="Supprimer mon compte"
          testID="profile-delete-account-action"
        />

        <ProfileVersion />
      </View>
    </View>
  );
};

export default ProfileAccountSection;

const styles = StyleSheet.create({
  section: { gap: spacing[3] },
  sectionTitle: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.extraBold,
    letterSpacing: letterSpacing.overline,
    textTransform: "uppercase",
  },
  actions: { gap: spacing[3], marginTop: spacing[1] },
  profileAction: { height: 46 },
});
