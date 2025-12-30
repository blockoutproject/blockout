import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import type { EnrichedPoolDTO } from "@/src/types/Pool";
import type { TeamHighlight } from "@/src/types/Team";
import RankingRow from "./RankingRow";
import RankingHeader from "./RankingHeader";
import { useRouter } from "expo-router";
import { useNavigationInterstitial } from "@/src/hooks/ads/useNavigationInterstitial";

type RankingCardProps = {
    enrichedPool: EnrichedPoolDTO;
    scrollable?: boolean;
    highlightTeams?: TeamHighlight[];
};

const RADIUS = 18;

const RankingCard: React.FC<RankingCardProps> = ({
    enrichedPool,
    scrollable = true,
    highlightTeams,
}) => {
    const theme = useAppTheme();
    const router = useRouter();
    const { handleNavigationWithAd } = useNavigationInterstitial();

    const { division } = enrichedPool;
    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    const handleTeamPress = useCallback(
        async (teamId: number) => {
            await Haptics.selectionAsync();

            handleNavigationWithAd(() => {
                router.push(`/team/${teamId}`);
            });
        },
        [router, handleNavigationWithAd]
    );

    const handleHeaderPress = useCallback(
        async () => {
            await Haptics.selectionAsync();

            handleNavigationWithAd(() => {
                router.push(`/pool/${enrichedPool.id}`);
            });
        },
        [router, handleNavigationWithAd]
    );

    return (
        <GradientBorderView
            gradient={gradient}
            borderRadius={RADIUS}
            borderWidth={1}
            style={[styles.card, { backgroundColor: theme.background }]}
        >
            <View style={styles.innerClip}>
                <FlatList
                    data={enrichedPool.ranking}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item, index }) => (
                        <RankingRow
                            item={item}
                            index={index}
                            theme={theme}
                            highlightTeams={highlightTeams}
                            gradient={gradient}
                            onPress={handleTeamPress}
                        />
                    )}
                    ListHeaderComponent={
                        <RankingHeader
                            pool={enrichedPool}
                            onPress={handleHeaderPress}
                        />
                    }
                    stickyHeaderIndices={[0]}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={scrollable}
                    contentContainerStyle={styles.listContent}
                />
            </View>
        </GradientBorderView>
    );
};

export default RankingCard;

const styles = StyleSheet.create({
    card: { borderRadius: RADIUS },
    innerClip: { borderRadius: RADIUS - 1, overflow: "hidden" },
    listContent: { paddingBottom: 8, gap: 10 },
});