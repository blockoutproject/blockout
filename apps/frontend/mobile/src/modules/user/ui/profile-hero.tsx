import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Hero from "@/src/shared/ui/hero";
import type { UserResponse } from "@/src/shared/generated/models";
import { usePurchases } from "@/src/modules/subscription/providers/purchases-provider";
import { fontWeight, gradients, radius, useAppTheme } from "@/src/shared/theme";
import { GradientPill } from "@/src/shared/ui/pill";

export type UserHeroProps = {
  user: UserResponse;
  onEdit?: () => void;
};

const ProfileHero: React.FC<UserHeroProps> = ({ user, onEdit }) => {
  const theme = useAppTheme();
  const { isPro, isHydrated } = usePurchases();

  const title = user.pseudo || "Utilisateur";
  const email = user.email || undefined;

  const topAccessory = useMemo(() => {
    if (!isHydrated || !isPro) return null;

    return (
      <GradientPill
        size="md"
        borderWidth={2}
        backgroundColor={theme.background}
        treatment="border"
        gradient={gradients.premium}
        leftIcon="rocket-launch-outline"
        label="Pro"
        textColor={theme.gold}
        iconColor={theme.gold}
        labelStyle={{ color: theme.gold, fontWeight: fontWeight.black }}
        style={styles.proPill}
      />
    );
  }, [isHydrated, isPro, theme.background, theme.gold]);

  return (
    <View style={styles.root}>
      <Hero
        variant={email ? "titleAndMeta" : "title"}
        title={title}
        subtitle={email}
        subtitleIcon={email ? "email-outline" : undefined}
        avatarUri={user.pictureUrl || undefined}
        avatarFallback={require("@/assets/users/default_user_avatar.png")}
        backgroundUri={user.pictureUrl || undefined}
        backgroundFallback={require("@/assets/users/default_user_avatar.png")}
        onEdit={onEdit}
        testID="profile-hero"
        editTestID="profile-hero-edit"
        topAccessory={topAccessory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: "relative",
  },
  proPill: {
    height: 28,
    alignSelf: "flex-start",
    borderRadius: radius.full,
  },
});

export default ProfileHero;
