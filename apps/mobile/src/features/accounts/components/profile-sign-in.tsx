import { Bell, Check, UserRound } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { SignInInvitationCard } from "./sign-in-invitation";

const benefits = [
  { label: "Vos suivis réunis au même endroit", icon: Check },
  { label: "Les notifications de vos matchs", icon: Bell },
  { label: "Votre profil et vos suivis synchronisés", icon: UserRound },
] as const;

/** The profile owner keeps ordinary admission, current-session checks and sign-in navigation. */
export interface ProfileSignInProps {
  onSignIn(): void;
}

/** Approved guest profile invitation and benefits, using the same artwork as contextual invitations. */
export function ProfileSignIn({ onSignIn }: ProfileSignInProps) {
  const { colors } = useTheme();
  return (
    <SignInInvitationCard
      message="Vos équipes, à vos côtés."
      onSignIn={onSignIn}
    >
      <Text style={[tokens.typography.body, { color: colors.secondaryText }]}>
        Connectez-vous pour suivre vos équipes et vos poules, et retrouver leurs
        résultats.
      </Text>
      {benefits.map(({ label, icon: Icon }) => (
        <View key={label} style={styles.benefit}>
          <Icon
            accessible={false}
            size={tokens.size.icon.md}
            color={colors.icon}
          />
          <Text style={[styles.label, { color: colors.secondaryText }]}>
            {label}
          </Text>
        </View>
      ))}
    </SignInInvitationCard>
  );
}

const styles = StyleSheet.create({
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  label: { ...tokens.typography.body, flex: 1, minWidth: 0 },
});
