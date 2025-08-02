import React, { useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { Image } from 'expo-image';
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import BottomSheetCustomPage from "../../common/BottomSheetCustomPage";
import { EnrichedMatchDTO } from "@/src/types/Match";
import { router } from "expo-router";

type MatchInfoCardProps = {
    enrichedMatch: EnrichedMatchDTO
};

const MatchInfoCard: React.FC<MatchInfoCardProps> = ({ enrichedMatch }) => {
    const theme = useAppTheme();

    const handlePoolPress = (poolId: number) => {
        Haptics.selectionAsync();
        router.push(`/pool/${poolId}`);
    };

    const InfoRow = ({
        icon,
        text,
    }: {
        icon: keyof typeof MaterialCommunityIcons.glyphMap;
        text: string | null;
    }) =>
        text ? (
            <View style={styles.row}>
                <MaterialCommunityIcons name={icon} size={22} color={theme.text} style={styles.icon} />
                <Text
                    style={[styles.infoText, { color: theme.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {text}
                </Text>
            </View>
        ) : null;

    return (
        <View style={[styles.container, { backgroundColor: theme.background, borderColor: enrichedMatch.pool.division.mainColor }]}>
            <Text style={[styles.title, { color: theme.text }]}>Information</Text>

            <View style={styles.infoRow}>
                <TouchableOpacity
                    style={styles.row}
                    onPress={() => handlePoolPress(enrichedMatch.pool.id)}
                >
                    <Image
                        source={{ uri: enrichedMatch.pool.division.logoUrl || "" }}
                        style={[styles.poolLogo, { backgroundColor: theme.text }]}
                        contentFit="contain"
                    />
                    <Text
                        style={[styles.poolTitleText, { color: theme.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                    >
                        {enrichedMatch.pool.name}
                    </Text>
                </TouchableOpacity>

                <InfoRow icon="trophy" text={enrichedMatch.pool.leagueName === 'PRO' ? 'Professionnel' : enrichedMatch.pool.division.name} />
                <InfoRow
                    icon="calendar"
                    text={new Date(enrichedMatch.matchDate).toLocaleString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                />
                <InfoRow icon="map-marker" text={enrichedMatch.venue} />
                <InfoRow icon="whistle" text={enrichedMatch.firstReferee} />
                <InfoRow icon="whistle" text={enrichedMatch.secondReferee} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderRadius: 18,
        padding: 16,
    },
    infoRow: {
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 16,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    poolLogo: {
        width: 22,
        aspectRatio: 1,
        marginRight: 12,
        borderRadius: 5,
    },
    poolTitleText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "700",
    },
    icon: {
        marginRight: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
    },
});

export default MatchInfoCard;