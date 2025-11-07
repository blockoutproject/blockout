import React from "react";
import Hero from "@/src/components/common/Hero";
import type { CustomUser } from "@/src/types/User";

export type UserHeroProps = {
    user: CustomUser;
    onEdit?: () => void;
};

const AVATAR_SIZE = 120;

const ProfileHero: React.FC<UserHeroProps> = ({ user, onEdit }) => {
    const title = user.pseudo || "Utilisateur";
    const email = user.email || undefined;

    return (
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
        />
    );
};

export default ProfileHero;