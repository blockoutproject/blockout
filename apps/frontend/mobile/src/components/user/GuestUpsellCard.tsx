import React, {useState} from "react";
import {StyleSheet, Text, View} from "react-native";
import * as Haptics from "expo-haptics";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {useSessionActions, useSessionState} from "@/src/shared/providers/SessionProvider";
import {withAlpha} from "@/src/utils/utils";
import {GradientButton} from "@/src/shared/ui/GradientButton";

type Props = {
  title?: string;
  subtitle?: string;
};

const GuestUpsellCard: React.FC<Props> = ({
                                            title = "Débloque toutes les fonctionnalités",
                                            subtitle = "Connecte-toi pour suivre tes équipes, recevoir des notifications et personnaliser ton profil.",
                                          }) => {
  const theme = useAppTheme();
  const {signIn} = useSessionActions();
  const {isLoading} = useSessionState();
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
          borderColor: withAlpha(theme.text, 0.08),
        },
      ]}
    >
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="account-arrow-right-outline" size={18} color={withAlpha(theme.text, 0.7)}/>
        <Text style={[styles.title, {color: theme.text}]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <Text style={[styles.subtitle, {color: withAlpha(theme.text, 0.8)}]}>{subtitle}</Text>

      {/* petits bénéfices */}
      <View style={styles.benefits}>
        <Benefit label="Suivi des équipes" icon="star-outline"/>
        <Benefit label="Alertes de match" icon="bell-outline"/>
        <Benefit label="Profil synchronisé" icon="cloud-check-outline"/>
      </View>

      <GradientButton
        onPress={onSignIn}
        loading={loading || isLoading}
        disabled={loading || isLoading}
        label="Se connecter"
        loadingLabel="Connexion…"
        leftIcon={<MaterialCommunityIcons name="account" size={18} color={"#000"}/>}
        textColor="#000"
        fullWidth
      />
    </View>
  );
};

export default GuestUpsellCard;

const Benefit: React.FC<{ icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string }> = ({
                                                                                                                   icon,
                                                                                                                   label,
                                                                                                                 }) => {
  const theme = useAppTheme();
  return (
    <View style={styles.benefitRow}>
      <MaterialCommunityIcons name={icon} size={16} color={withAlpha(theme.text, 0.7)}/>
      <Text style={[styles.benefitText, {color: withAlpha(theme.text, 0.85)}]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  title: {fontSize: 16, fontWeight: "900"},
  subtitle: {fontSize: 14, lineHeight: 20, fontWeight: "600"},
  benefits: {gap: 8, marginTop: 2, marginBottom: 6},
  benefitRow: {flexDirection: "row", gap: 8, alignItems: "center"},
  benefitText: {fontSize: 13, fontWeight: "700"},
});
