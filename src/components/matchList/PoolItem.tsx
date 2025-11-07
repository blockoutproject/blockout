import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";
import MatchRow from "./MatchRow";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import FadeIn from "../common/animations/FadeIn";
import { SECTION_SEPARATOR_HEIGHT } from "@/src/theme/globals";
import { useMappingHelper } from "@shopify/flash-list";
import RankingHeader from "../ranking/RankingHeader";
import { useRouter } from "expo-router";

/** Carte listant les matchs d’une poule. */
export type PoolItemProps = {
    /** Données enrichies de la poule + matches. */
    enrichedPoolMatches: EnrichedPoolMatchesDTO;
    /** Callback ouverture d’un match. */
    handleMatchPress: (id: number) => void;
    /** Affiche l’en-tête cliquable de la poule. */
    showHeader?: boolean;
};

const RADIUS = 16;

const PoolItem: React.FC<PoolItemProps> = ({
    enrichedPoolMatches,
    handleMatchPress,
    showHeader = true,
}) => {
    const theme = useAppTheme();
    const { getMappingKey } = useMappingHelper();
    const router = useRouter();
    const division = enrichedPoolMatches.pool.division;

    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    const handleHeaderPress = () => {
        Haptics.selectionAsync();
        router.push(`/pool/${enrichedPoolMatches.pool.id}`);
    };

    return (
        <FadeIn >
            <View style={styles.wrapper}>
                <GradientBorderView
                    gradient={gradient}
                    borderRadius={RADIUS}
                    borderWidth={1}
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.surface,
                        },
                    ]}
                >
                    <View
                        style={styles.innerClip}
                    >
                        {showHeader ? (
                            <RankingHeader pool={enrichedPoolMatches.pool} onPress={handleHeaderPress} />
                        ) : null}

                        <View
                            style={styles.matchList}
                        >
                            {enrichedPoolMatches.matches.map((enrichedMatch, index) => (
                                <TouchableOpacity
                                    key={getMappingKey(enrichedMatch.id, index)}
                                    activeOpacity={0.85}
                                    onPress={() => handleMatchPress(enrichedMatch.id)}
                                >
                                    <MatchRow
                                        enrichedMatch={enrichedMatch}
                                        division={division}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </GradientBorderView>
            </View>
        </FadeIn>
    );
};

export default React.memo(PoolItem);

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: SECTION_SEPARATOR_HEIGHT,
    },
    card: {
        borderRadius: RADIUS,
    },
    innerClip: {
        borderRadius: RADIUS - 1,
        overflow: "hidden",
    },
    headerRow: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    poolTitle: {
        fontSize: 14,
        fontWeight: "800",
        flexShrink: 1
    },
    divisionTitle: {
        flex: 1,
        fontSize: 11,
        fontWeight: "600",
    },
    matchList: {
        padding: 8,
        gap: 8,
        backgroundColor: "transparent",
    },
});