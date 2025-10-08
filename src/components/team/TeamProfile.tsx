import React from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { EnrichedTeamDTO } from "@/src/types/Team";
import { useTeamFollowState } from "@/src/hooks/team/useTeamFollowState";
import FollowButton from "@/src/components/common/follow/FollowButton";
import FollowersCounter from "@/src/components/common/follow/FollowersCount";
import { GenderLabels } from "@/src/types/enums/Gender";
import { FormatLabels } from "@/src/types/enums/Format";
import { LOGO_SIZE } from "@/src/theme/globals";
import InfoPill from "@/src/components/common/chips/InfoPill";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import InfoPillGradient from "../common/chips/InfoPillGradient";

/** Team profile header with logo, tags, club link and follow. */
export type TeamProfileProps = {
    /** Enriched team entity. */
    enrichedTeam: EnrichedTeamDTO;
};

const TeamProfile: React.FC<TeamProfileProps> = ({ enrichedTeam }) => {
    const router = useRouter();
    const { isFollowing, isProcessing, followersCount, onToggleFollow } = useTeamFollowState(enrichedTeam);

    const gradient = [
        enrichedTeam.division.firstGradientColor,
        enrichedTeam.division.secondGradientColor,
        enrichedTeam.division.thirdGradientColor,
    ] as const;

    const handleClubPress = (clubId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(`/clubs/${clubId}`);
    };

    return (
        <View
            style={styles.container}
            testID="team-profile"
        >
            <MaskedImage
                uri={enrichedTeam.club.logoUrl}
                size={LOGO_SIZE}
                radius={20}
                shadow
            />

            <View
                style={styles.infoCol}
            >
                <View
                    style={styles.pillRow}
                >
                    <InfoPill label={enrichedTeam.division.name} />
                    <InfoPill label={GenderLabels[enrichedTeam.gender]} />
                </View>

                <View
                    style={styles.pillRow}
                >
                    <InfoPill label={FormatLabels[enrichedTeam.format]} />
                    <InfoPill label={String(enrichedTeam.season)} />
                    <InfoPillGradient
                        leftIcon="home"
                        rightIcon="chevron-forward-outline"
                        variant="filled"
                        gradient={gradient}
                        onPress={() => handleClubPress(enrichedTeam.club.id)}
                    />
                </View>

                <View
                    style={styles.actionsRow}
                >
                    <FollowButton
                        isFollowing={isFollowing}
                        onPress={onToggleFollow}
                        disabled={isProcessing}
                        gradient={gradient}
                    />
                    <FollowersCounter
                        count={followersCount}
                    />
                </View>
            </View>
        </View>
    );
};

export default TeamProfile;

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    infoCol: {
        flex: 1,
        minWidth: 0,
        height: LOGO_SIZE,
        justifyContent: "space-between",
    },
    pillRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
});