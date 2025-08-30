import React from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { EnrichedTeamDTO } from "@/src/types/Team";
import { useTeamFollowState } from "@/src/hooks/team/useTeamFollowState";
import FollowButton from "@/src/components/common/FollowButton";
import FollowersCounter from "@/src/components/common/FollowersCount";
import { GenderLabels } from "@/src/types/enums/Gender";
import { FormatLabels } from "@/src/types/enums/Format";
import { LOGO_SIZE } from "@/src/theme/globals";
import InfoChipGradient from "../../common/chips/InfoChipGradientTwoIcons";
import InfoPill from "../../common/chips/InfoPill";
import MaskedImage from "../../common/images/MaskedImage";
import { useRouter } from "expo-router";

type TeamProfileProps = {
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
        <View style={styles.container}>
            <MaskedImage uri={enrichedTeam.club.logoUrl} size={LOGO_SIZE} radius={20} shadow />

            <View style={styles.infoCol}>
                <View style={styles.pillRow}>
                    <InfoPill label={enrichedTeam.division.name} />
                    <InfoPill label={GenderLabels[enrichedTeam.gender]} />
                </View>

                <View style={styles.pillRow}>
                    <InfoPill label={FormatLabels[enrichedTeam.format]} />
                    <InfoPill label={String(enrichedTeam.season)} />
                    <InfoChipGradient
                        firstIcon="home"
                        secondIcon="chevron-forward-outline"
                        gradient={gradient}
                        onPress={() => handleClubPress(enrichedTeam.club.id)}
                    />
                </View>

                <View style={styles.actionsRow}>
                    <FollowButton
                        isFollowing={isFollowing}
                        onPress={onToggleFollow}
                        disabled={isProcessing}
                        gradient={gradient}
                    />
                    <FollowersCounter count={followersCount} />
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
        gap: 6,
        flexWrap: "nowrap",
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
});