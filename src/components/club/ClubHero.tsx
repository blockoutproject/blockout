import React from "react";
import type { Club } from "@/src/types/Club";
import Hero from "../common/Hero";

export type ClubHeroProps = {
    club: Club;
    onEdit?: () => void;
};

const AVATAR_SIZE = 120;

const ClubHero: React.FC<ClubHeroProps> = ({ club, onEdit }) => {
    return (
        <Hero
            title={club.name}
            subtitle={club.city || undefined}
            subtitleIcon={club.city ? "map-marker" : undefined}
            avatarUri={club.logoUrl}
            avatarFallback={require("@/assets/clubs/default_club_logo.png")}
            backgroundUri={club.logoUrl}
            backgroundFallback={require("@/assets/clubs/default_club_logo.png")}
            onEdit={onEdit}
            testID="club-hero"
            editTestID="club-hero-edit"
            containerRadius={18}
            avatarSize={AVATAR_SIZE}
            avatarRadius={24}
            blurRadius={60}
            titleLines={2}
        />
    );
};

export default ClubHero;