import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Hero from "@/src/shared/ui/Hero";
import type { UserResponse } from "@/src/shared/generated/models";
import { usePurchases } from "@/src/modules/subscription/providers/PurchasesProvider";
import { gradients, useAppTheme } from "@/src/shared/theme";
import { GradientPill } from "@/src/shared/ui/pill";

export type UserHeroProps = {
  user: UserResponse;
  onEdit?: () => void;
};

const AVATAR_SIZE = 120;

const ProfileHero: React.FC<UserHeroProps> = ({ user, onEdit }) => {
  const theme = useAppTheme();
  const { isPro, isHydrated } = usePurchases();

  const title = user.pseudo || "Utilisateur";
  const email = user.email || undefined;

  const topLeftNode = useMemo(() => {
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
        labelStyle={{ color: theme.gold, fontWeight: "900" }}
        style={styles.proPill}
      />
    );
  }, [isHydrated, isPro, theme.background, theme.gold]);

  return (
    <View style={styles.root}>
      <Hero
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
        containerRadius={18}
        avatarSize={AVATAR_SIZE}
        avatarRadius={AVATAR_SIZE / 2}
        blurRadius={60}
        titleLines={2}
        topLeftNode={topLeftNode}
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
    borderRadius: 999,
  },
});

export default ProfileHero;
