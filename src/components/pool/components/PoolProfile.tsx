import React from "react";
import { View, StyleSheet } from "react-native";

import { EnrichedPoolDTO } from "@/src/types/Pool";
import FollowButton from "@/src/components/common/FollowButton";
import FollowersCounter from "@/src/components/common/FollowersCount";
import { usePoolFollowState } from "@/src/hooks/pool/usePoolFollowState";
import { GenderLabels } from "@/src/types/enums/Gender";
import InfoPill from "@/src/components/common/chips/InfoPill";
import { LOGO_SIZE } from "@/src/theme/globals";
import MaskedImage from "../../common/images/MaskedImage";

type PoolProfileProps = {
    enrichedPool: EnrichedPoolDTO;
};

const PoolProfile: React.FC<PoolProfileProps> = ({ enrichedPool }) => {
    const { isFollowing, isProcessing, followersCount, onToggleFollow } =
        usePoolFollowState(enrichedPool);

    const division = enrichedPool.division;

    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    return (
        <View style={styles.container}>
            <MaskedImage uri={enrichedPool.division.logoUrl} size={LOGO_SIZE} radius={20} shadow />

            <View style={styles.infoCol}>
                <View style={styles.pillRow}>
                    <InfoPill label={division.name} />
                    <InfoPill label={GenderLabels[enrichedPool.gender]} />
                </View>

                <View style={styles.pillRow}>
                    <InfoPill label={enrichedPool.leagueName} />
                    <InfoPill label={String(enrichedPool.season)} />
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

export default PoolProfile;

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        paddingTop: 8,
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