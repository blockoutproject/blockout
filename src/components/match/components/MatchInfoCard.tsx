import React from "react";
import { View, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import type { EnrichedMatchDTO } from "@/src/types/Match";
import type { SheetStackParamList } from "@/src/components/common/BottomSheetNavigator";
import InfoPillGradient from "../../common/chips/InfoPillGradient";

type MatchInfoCardProps = {
    enrichedMatch: EnrichedMatchDTO;
};

const RADIUS = 18;

const MatchInfoCard: React.FC<MatchInfoCardProps> = ({ enrichedMatch }) => {
    const theme = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<SheetStackParamList>>();

    const division = enrichedMatch.pool.division;
    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    const dateLabel = new Date(enrichedMatch.matchDate).toLocaleString("fr-FR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const leagueLabel = enrichedMatch.pool.leagueName === "PRO" ? "Professionnel" : division.name;
    const venue = enrichedMatch.venue || "Lieu à confirmer";
    const ref1 = enrichedMatch.firstReferee;
    const ref2 = enrichedMatch.secondReferee;

    const handlePoolPress = (poolId: number) => {
        Haptics.selectionAsync();
        navigation.push("Pool", { poolId });
    };

    return (
        <GradientBorderView
            gradient={gradient}
            borderRadius={RADIUS}
            borderWidth={1}
            style={[styles.card, { backgroundColor: theme.background }]}
        >
            <Text style={[styles.title, { color: theme.text }]}>Informations</Text>

            <View style={styles.pillsWrap}>
                <InfoPillGradient icon="trophy-variant" label={leagueLabel} gradient={gradient} borderWidth={1} />
                <InfoPillGradient
                    label={enrichedMatch.pool.name}
                    gradient={gradient}
                    variant="filled"
                    onPress={() => handlePoolPress(enrichedMatch.pool.id)}
                />
                <InfoPillGradient icon="calendar" label={dateLabel} gradient={gradient} borderWidth={1} />
                <InfoPillGradient icon="map-marker" label={venue} gradient={gradient} borderWidth={1} />
                {ref1 && <InfoPillGradient icon="whistle" label={ref1} gradient={gradient} borderWidth={1} />}
                {ref2 && <InfoPillGradient icon="whistle" label={ref2} gradient={gradient} borderWidth={1} />}
            </View>
        </GradientBorderView>
    );
};

export default MatchInfoCard;

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS,
        padding: 14,
        gap: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    pillsWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
});