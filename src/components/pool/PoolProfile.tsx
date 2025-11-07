import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import * as Haptics from "expo-haptics";

import { EnrichedPoolDTO } from "@/src/types/Pool";
import FollowButton from "@/src/components/common/follow/FollowButton";
import FollowersCounter from "@/src/components/common/follow/FollowersCount";
import { usePoolFollowState } from "@/src/hooks/pool/usePoolFollowState";
import { GenderLabels } from "@/src/types/enums/Gender";
import InfoPill from "@/src/components/common/chips/InfoPill";
import { LOGO_SIZE } from "@/src/theme/globals";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import { computeBalancedRowsByCount } from "@/src/utils/utils";

export type PoolProfileProps = {
    enrichedPool: EnrichedPoolDTO;
};

const GAP = 6;

const PoolProfile: React.FC<PoolProfileProps> = ({ enrichedPool }) => {
    const { isFollowing, isProcessing, followersCount, onToggleFollow } = usePoolFollowState(enrichedPool);

    const division = enrichedPool.division;
    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    const pillsData = useMemo(
        () => [
            enrichedPool.leagueName,
            division.name,
            GenderLabels[enrichedPool.gender],
            String(enrichedPool.season),
        ],
        [enrichedPool.leagueName, division.name, enrichedPool.gender, enrichedPool.season]
    );

    const [containerWidth, setContainerWidth] = useState(0);
    const [pillWidths, setPillWidths] = useState<number[]>([]);
    const [measured, setMeasured] = useState(false);

    // Reset mesures si texte/longueur change
    useEffect(() => {
        setPillWidths(Array(pillsData.length).fill(0));
        setMeasured(false);
    }, [pillsData.length, pillsData.join("|")]);

    const handleContainerLayout = (e: LayoutChangeEvent) => {
        setContainerWidth(Math.max(0, Math.floor(e.nativeEvent.layout.width)));
    };

    const handleMeasurePill = useCallback((index: number, e: LayoutChangeEvent) => {
        const w = Math.ceil(e.nativeEvent.layout.width);
        setPillWidths(prev => {
            if (prev[index] === w) return prev;
            const next = prev.slice();
            next[index] = w;
            return next;
        });
    }, []);

    useEffect(() => {
        if (containerWidth <= 0) return;
        if (pillWidths.length !== pillsData.length) return;
        if (pillWidths.some(w => w <= 0)) return;
        setMeasured(true);
    }, [containerWidth, pillWidths, pillsData.length]);

    const { topIndices, bottomIndices } = useMemo(() => {
        if (!measured) {
            const mid = Math.ceil(pillsData.length / 2);
            return {
                topIndices: pillsData.map((_, i) => i).slice(0, mid),
                bottomIndices: pillsData.map((_, i) => i).slice(mid),
            };
        }
        return computeBalancedRowsByCount({ containerWidth, pillWidths, gap: GAP });
    }, [measured, pillsData, containerWidth, pillWidths]);

    const handleFollow = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onToggleFollow();
    };

    return (
        <View style={styles.container} testID="pool-profile">
            <MaskedImage uri={division.logoUrl} size={LOGO_SIZE} radius={20} shadow />

            <View style={{ flex: 1 }}>
                {/* Zone visible */}
                <View onLayout={handleContainerLayout} style={styles.twoRows}>
                    <View style={styles.pillsRow}>
                        {topIndices.map(i => (
                            <InfoPill key={`pill-${i}`} label={pillsData[i]} />
                        ))}
                    </View>
                    <View style={styles.pillsRow}>
                        {bottomIndices.map(i => (
                            <InfoPill key={`pill-${i}`} label={pillsData[i]} />
                        ))}
                    </View>
                </View>

                {/* Mesure cachée (1 passe) */}
                {!measured && (
                    <View pointerEvents="none" style={styles.measureRow}>
                        {pillsData.map((label, i) => (
                            <View key={`measure-${i}`} onLayout={(e) => handleMeasurePill(i, e)}>
                                <InfoPill label={label} />
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.actionsRow}>
                    <FollowButton
                        isFollowing={isFollowing}
                        onPress={handleFollow}
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
        paddingTop: 4,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    twoRows: {
        gap: GAP,
    },
    pillsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: GAP,
    },
    actionsRow: {
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    measureRow: {
        position: "absolute",
        opacity: 0,
        zIndex: -1,
        flexDirection: "row",
        flexWrap: "nowrap",
        gap: GAP,
    },
});