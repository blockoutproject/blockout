import React, { useMemo } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import MatchCard from "./MatchCard";
import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientView from "../../common/GradientView";
import { usePoolGradient } from "@/src/hooks/utils/usePoolGradient";
import { usePoolBorderGradient } from "@/src/hooks/utils/usePoolBorderGradient";

type Props = {
    pool: EnrichedPoolMatchesDTO;
    handlePoolPress: (id: number) => void;
    handleMatchPress: (id: number) => void;
};

const PoolItem: React.FC<Props> = ({
    pool,
    handlePoolPress,
    handleMatchPress,
}) => {
    const theme = useAppTheme();
    const gradientVariants = usePoolGradient(pool.poolId);
    const borderGradientVariants = usePoolBorderGradient(pool.poolId);

    return (
        <GradientView style={styles.poolContainer} gradient={gradientVariants}>
            <TouchableOpacity onPress={() => handlePoolPress(pool.poolId)}>
                <View style={styles.poolHeader}>
                    <FastImage
                        source={require("@/assets/leagues/msl.png")}
                        style={styles.poolLogo}
                        resizeMode="contain"
                    />
                    <Text
                        style={[styles.poolTitle, { color: theme.text }]}
                        numberOfLines={1}
                    >
                        {pool.poolData?.name ?? "Chargement..."}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.matchList}>
                {pool.matches.map((match) => (
                    <TouchableOpacity key={match.id} onPress={() => handleMatchPress(match.id)}>
                        <MatchCard
                            match={match}
                            teamA={match.teamA}
                            teamB={match.teamB}
                            gradient={borderGradientVariants}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </GradientView>
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
