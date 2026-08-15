import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  iconSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
  typography,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";

type ProfileLegalSectionProps = {
  onOpenImprint: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenAdvertisingPrivacy?: () => void;
};

type LegalItemRowProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  testID: string;
};

/** Renders one accessible destination in the profile legal section. */
const LegalItemRow = ({ icon, label, onPress, testID }: LegalItemRowProps) => {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: withAlpha(theme.text, 0.06) }}
      style={({ pressed }) => [
        styles.itemRow,
        {
          backgroundColor: pressed
            ? withAlpha(theme.surface, 0.9)
            : theme.surface,
          borderColor: withAlpha(theme.text, 0.1),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <View style={styles.itemLeft}>
        <MaterialCommunityIcons
          name={icon}
          size={iconSize.control}
          color={withAlpha(theme.text, 0.8)}
        />
        <Text
          style={[styles.itemText, { color: theme.text }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward-outline"
        size={iconSize.md}
        color={withAlpha(theme.text, 0.5)}
      />
    </Pressable>
  );
};

/** Renders legal documents and the conditional UMP privacy destination. */
const ProfileLegalSection = ({
  onOpenImprint,
  onOpenTerms,
  onOpenPrivacy,
  onOpenAdvertisingPrivacy,
}: ProfileLegalSectionProps) => {
  const theme = useAppTheme();

  return (
    <View style={styles.section}>
      <Text
        style={[styles.sectionTitle, { color: withAlpha(theme.text, 0.7) }]}
      >
        Légal
      </Text>
      <View style={styles.cardList}>
        <LegalItemRow
          icon="file-document-outline"
          label="Mentions légales"
          onPress={onOpenImprint}
          testID="profile-imprint-action"
        />
        <LegalItemRow
          icon="script-text-outline"
          label="Conditions d'utilisation"
          onPress={onOpenTerms}
          testID="profile-terms-action"
        />
        <LegalItemRow
          icon="shield-lock-outline"
          label="Politique de confidentialité"
          onPress={onOpenPrivacy}
          testID="profile-privacy-action"
        />
        {onOpenAdvertisingPrivacy ? (
          <LegalItemRow
            icon="shield-check-outline"
            label="Choix de confidentialité publicitaire"
            onPress={onOpenAdvertisingPrivacy}
            testID="profile-advertising-privacy-action"
          />
        ) : null}
      </View>
    </View>
  );
};

export default ProfileLegalSection;

const styles = StyleSheet.create({
  section: { gap: spacing[3] },
  sectionTitle: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.extraBold,
    letterSpacing: letterSpacing.overline,
    textTransform: "uppercase",
  },
  cardList: { gap: spacing.compact },
  itemRow: {
    padding: spacing.inset,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.compact,
    flex: 1,
    minWidth: 0,
  },
  itemText: {
    flex: 1,
    fontSize: typography.body.fontSize,
    fontWeight: fontWeight.bold,
  },
});
