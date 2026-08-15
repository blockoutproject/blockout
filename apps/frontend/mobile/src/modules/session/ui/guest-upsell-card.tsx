import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  iconSize,
  borderWidth,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import {
  useSessionActions,
  useSessionState,
} from "@/src/modules/session/providers/session-context";
import { Action } from "@/src/shared/ui/action";

export type GuestUpsellCardProps = {
  title?: string;
  subtitle?: string;
};

/** Presents the shared sign-in prompt used by guest-only feature boundaries. */
const GuestUpsellCard: React.FC<GuestUpsellCardProps> = ({
  title = "Débloque toutes les fonctionnalités",
  subtitle = "Connecte-toi pour suivre tes équipes, recevoir des notifications et personnaliser ton profil.",
}) => {
  const theme = useAppTheme();
  const { signIn } = useSessionActions();
  const { isLoading } = useSessionState();
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    try {
      setLoading(true);
      await signIn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <MaterialCommunityIcons
          name="account-arrow-right-outline"
          size={iconSize.control}
          color={theme.textSecondary}
        />
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {title}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {subtitle}
      </Text>

      <View style={styles.benefits}>
        <Benefit label="Suivi des équipes" icon="star-outline" />
        <Benefit label="Alertes de match" icon="bell-outline" />
        <Benefit label="Profil synchronisé" icon="cloud-check-outline" />
      </View>

      <Action
        onPress={onSignIn}
        loading={loading || isLoading}
        disabled={loading || isLoading}
        label="Se connecter"
        loadingLabel="Connexion…"
        leftIcon={
          <MaterialCommunityIcons
            name="account"
            size={iconSize.control}
            color={theme.onPrimary}
          />
        }
        fullWidth
        testID="guest-sign-in-action"
      />
    </View>
  );
};

export default GuestUpsellCard;

type BenefitProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
};

/** Renders one concise benefit inside the guest prompt. */
const Benefit: React.FC<BenefitProps> = ({ icon, label }) => {
  const theme = useAppTheme();
  return (
    <View style={styles.benefitRow}>
      <MaterialCommunityIcons
        name={icon}
        size={iconSize.sm}
        color={theme.textSecondary}
      />
      <Text style={[styles.benefitText, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: borderWidth.thin,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing[4],
    gap: spacing[3],
  },
  headerRow: {
    flexDirection: "row",
    gap: spacing[2],
    alignItems: "center",
  },
  title: {
    ...typography.control,
    flex: 1,
  },
  subtitle: typography.body,
  benefits: {
    gap: spacing[2],
    marginTop: spacing.optical,
    marginBottom: spacing[1],
  },
  benefitRow: {
    flexDirection: "row",
    gap: spacing[2],
    alignItems: "center",
  },
  benefitText: typography.label,
});
