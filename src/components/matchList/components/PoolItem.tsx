import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Image } from 'expo-image';
import MatchCard from "./MatchCard";
import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";

type Props = {
    enrichedPoolMatches: EnrichedPoolMatchesDTO;
    handlePoolPress: (id: number) => void;
    handleMatchPress: (id: number) => void;
};

const PoolItem: React.FC<Props> = ({
    enrichedPoolMatches,
    handlePoolPress,
    handleMatchPress,
}) => {
    const theme = useAppTheme();

    const gradient: readonly [string, string, ...string[]] = [
        enrichedPoolMatches.pool.division.firstGradientColor,
        enrichedPoolMatches.pool.division.secondGradientColor,
        enrichedPoolMatches.pool.division.thirdGradientColor,
    ];

    return (
        <View style={[styles.poolContainer, { backgroundColor: enrichedPoolMatches.pool.division.mainColor }]}>
            <TouchableOpacity onPress={() => handlePoolPress(enrichedPoolMatches.pool.id)}>
                <View style={styles.poolHeader}>
                    <Image
                        source={{ uri: enrichedPoolMatches.pool.division.logoUrl || "" }}
                        style={[styles.poolLogo, { backgroundColor: theme.text }]}
                        contentFit="contain"
                    />
                    <Text
                        style={[styles.poolTitle, { color: theme.text }]}
                        numberOfLines={1}
                    >
                        {enrichedPoolMatches.pool.name}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.matchList}>
                {enrichedPoolMatches.matches.map((enrichedMatch) => (
                    <TouchableOpacity key={enrichedMatch.id} onPress={() => handleMatchPress(enrichedMatch.id)}>
                        <MatchCard
                            enrichedMatch={enrichedMatch}
                            gradient={gradient}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    poolContainer: {
        borderRadius: 18,
        padding: 8,
    },
    poolHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    poolLogo: {
        width: 25,
        height: 25,
        marginRight: 8,
        borderRadius: 12,
    },
    poolTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: "700",
    },
    matchList: {
        flexDirection: "column",
        gap: 12,
    },
});

export default PoolItem;
