import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { EnrichedTeamDTO } from "@/src/types/Team";
import { useTeamFollowState } from "@/src/hooks/team/useTeamFollowState";
import FollowButton from "@/src/components/common/follow/FollowButton";
import FollowersCounter from "@/src/components/common/follow/FollowersCount";
import { GenderLabels } from "@/src/types/enums/Gender";
import { FormatLabels } from "@/src/types/enums/Format";
import { LOGO_SIZE } from "@/src/theme/globals";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import InfoPillGradient from "../common/chips/InfoPillGradient";
import { useSession } from "@/src/context/SessionProvider";
import GuestPromptSheet, { GuestPromptSheetRef } from "../user/GuestPromptSheet.tsx";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { withAlpha } from "@/src/utils/utils";

export type TeamProfileProps = {
    enrichedTeam: EnrichedTeamDTO;
};

const GAP = 6;

function maxFitCount(containerWidth: number, widths: number[], gap: number) {
    let count = 0;
    let current = 0;
    for (let i = 0; i < widths.length; i++) {
        const w = widths[i];
        const next = count === 0 ? w : current + gap + w;
        if (next <= containerWidth) {
            count++;
            current = next;
        } else break;
    }
    return count;
}

function splitBalanced(containerWidth: number, widths: number[], gap: number) {
    const n = widths.length;
    if (n === 0) return { top: [] as number[], bottom: [] as number[] };
    const desiredTop = Math.ceil(n / 2);
    const cap = maxFitCount(containerWidth, widths, gap);
    const topCount = Math.max(1, Math.min(desiredTop, cap));
    const idx = Array.from({ length: n }, (_, i) => i);
    return { top: idx.slice(0, topCount), bottom: idx.slice(topCount) };
}

const TeamProfile: React.FC<TeamProfileProps> = ({ enrichedTeam }) => {
    const router = useRouter();
    const { isFollowing, isProcessing, followersCount, onToggleFollow } =
        useTeamFollowState(enrichedTeam);
    const { isGuest } = useSession();
    const guestSheetRef = useRef<GuestPromptSheetRef>(null);
    const theme = useAppTheme();

    const gradient = [
        enrichedTeam.division.firstGradientColor,
        enrichedTeam.division.secondGradientColor,
        enrichedTeam.division.thirdGradientColor,
    ] as const;

    const pills = useMemo(
        () => [
            enrichedTeam.division.name,
            GenderLabels[enrichedTeam.gender],
            FormatLabels[enrichedTeam.format],
            String(enrichedTeam.season),
        ],
        [enrichedTeam.division.name, enrichedTeam.gender, enrichedTeam.format, enrichedTeam.season],
    );

    const [containerWidth, setContainerWidth] = useState(0);
    const [widths, setWidths] = useState<number[]>(Array(pills.length).fill(0));

    useEffect(() => {
        setWidths(Array(pills.length).fill(0));
    }, [pills.length, pills.join("|")]);

    const ready =
        containerWidth > 0 &&
        widths.length === pills.length &&
        widths.every((w) => w > 0);

    const { top, bottom } = useMemo(() => {
        if (!ready) {
            const mid = Math.ceil(pills.length / 2);
            const idx = pills.map((_, i) => i);
            return { top: idx.slice(0, mid), bottom: idx.slice(mid) };
        }
        return splitBalanced(containerWidth, widths, GAP);
    }, [ready, pills, containerWidth, widths]);

    const onContainer = (e: LayoutChangeEvent) => {
        setContainerWidth(Math.max(0, Math.floor(e.nativeEvent.layout.width)));
    };

    const onMeasurePill = useCallback((i: number, e: LayoutChangeEvent) => {
        const w = Math.ceil(e.nativeEvent.layout.width);
        setWidths((prev) => {
            if (prev[i] === w) return prev;
            const next = prev.slice();
            next[i] = w;
            return next;
        });
    }, []);

    const handleClubPress = (clubId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(`/club/${clubId}`);
    };

    const handleFollow = () => {
        if (isGuest) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            guestSheetRef.current?.present();
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onToggleFollow();
        }
    };

    useEffect(() => {
        if (!isGuest) {
            guestSheetRef.current?.dismiss();
        }
    }, [isGuest]);

    const renderPill = (label: string, key: string | number) => (
        <InfoPillGradient
            key={key}
            label={label}
            size="sm"
            variant="filled"
            gradient={undefined} // 👉 mode "basic"
            borderWidth={1}
            backgroundColor={withAlpha(theme.surface, 0.95)}
            borderColor={withAlpha(theme.text, 0.12)}
            textColor={theme.textSecondary}
        />
    );

    return (
        <View style={styles.container} testID="team-profile">
            <MaskedImage uri={enrichedTeam.logoUrl} size={LOGO_SIZE} radius={20} />

            <View style={{ flex: 1 }}>
                <View onLayout={onContainer} style={styles.twoRows}>
                    <View style={styles.pillsRow}>
                        {top.map((i) => renderPill(pills[i], `pill-${i}`))}
                    </View>

                    <View style={styles.pillsRow}>
                        {bottom.map((i) => renderPill(pills[i], `pill-bottom-${i}`))}

                        <InfoPillGradient
                            leftIcon="home"
                            rightIcon="chevron-forward-outline"
                            variant="filled"
                            gradient={gradient}
                            onPress={() => handleClubPress(enrichedTeam.clubId)}
                        />
                    </View>
                </View>

                {!ready && (
                    <View pointerEvents="none" style={styles.measureRow}>
                        {pills.map((label, i) => (
                            <View
                                key={`measure-${i}`}
                                onLayout={(e) => onMeasurePill(i, e)}
                            >
                                {renderPill(label, `measure-pill-${i}`)}
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

            <GuestPromptSheet ref={guestSheetRef} />
        </View>
    );
};

export default TeamProfile;

const styles = StyleSheet.create({
    container: {
        paddingTop: 4,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    twoRows: { gap: GAP },
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