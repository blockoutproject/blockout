import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import FastImage from "react-native-fast-image";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import MatchCard from "./MatchCard";
import { EnrichedPoolMatchesDTO } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { matchListStyles } from "../matchListStyles";

type Props = {
    pool: EnrichedPoolMatchesDTO;
    index: number;
    handlePoolPress: (id: number) => void;
    handleMatchPress: (id: number) => void;
    mainLeagueColors: string[];
    secondLeagueColors: string[];
};

const PoolItem: React.FC<Props> = ({
    pool,
    index,
    handlePoolPress,
    handleMatchPress,
    mainLeagueColors,
    secondLeagueColors,
}) => {
    const theme = useAppTheme();
    const colorIndex = index % mainLeagueColors.length;

    return (
        <GradientBorderView
            style={[matchListStyles.poolContainer, { backgroundColor: theme.surface }]}
            colorsOverride={[theme.background, theme.background]}
        >
            <TouchableOpacity onPress={() => handlePoolPress(pool.poolId)}>
                <View style={matchListStyles.poolHeader}>
                    <FastImage
                        source={require("@/assets/leagues/msl.png")}
                        style={matchListStyles.poolLogo}
                        resizeMode="contain"
                    />
                    <Text
                        style={[matchListStyles.poolTitle, { color: theme.text }]}
                        numberOfLines={1}
                    >
                        {pool.poolData?.name ?? "Chargement..."}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={matchListStyles.matchList}>
                {pool.matches.map((match) => (
                    <TouchableOpacity key={match.id} onPress={() => handleMatchPress(match.id)}>
                        <MatchCard
                            match={match}
                            teamA={match.teamA}
                            teamB={match.teamB}
                            mainColor={mainLeagueColors[colorIndex]}
                            secondColor={secondLeagueColors[colorIndex]}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </GradientBorderView>
    );
};

export default PoolItem;