import React, { useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FastImage from "react-native-fast-image";
import * as Haptics from "expo-haptics";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

import { Pool } from "@/src/types/Pool";
import { useAppTheme } from "@/src/context/ThemeProvider";
import PoolContainer from "../../pool/PoolScreen";
import BottomSheetCustomPage from "../../common/BottomSheetCustomPage";
import { EnrichedMatchDTO } from "@/src/types/Match";

type MatchInfoCardProps = {
    enrichedMatch: EnrichedMatchDTO
};

const MatchInfoCard: React.FC<MatchInfoCardProps> = ({
    enrichedMatch
}) => {
    const theme = useAppTheme();
    const poolSheetRef = useRef<BottomSheetModal>(null);
    const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);

    const openPoolSheet = (id: number) => {
        Haptics.selectionAsync();
        setSelectedPoolId(id);
        poolSheetRef.current?.present();
    };

    const InfoRow = ({
        icon,
        text,
    }: {
        icon: keyof typeof Ionicons.glyphMap;
        text: string | null;
    }) =>
        text ? (
            <View style={styles.row}>
                <Ionicons name={icon} size={22} color={theme.text} style={styles.icon} />
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
        <>
            <View style={[styles.container, { backgroundColor: theme.surface }]}>
                <Text style={[styles.title, { color: theme.text }]}>Information</Text>

                <TouchableOpacity onPress={() => openPoolSheet(enrichedMatch.pool.id)} style={styles.row}>
                    <FastImage
                        source={{ uri: enrichedMatch.pool.division.logoUrl || "" }}
                        style={styles.poolLogo}
                        resizeMode="contain"
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

                <InfoRow icon="trophy-outline" text={enrichedMatch.pool.leagueName} />
                <InfoRow
                    icon="calendar-outline"
                    text={new Date(enrichedMatch.matchDate).toLocaleString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                />
                <InfoRow icon="time-outline" text={"1h30"} />
                <InfoRow icon="location-outline" text={enrichedMatch.venue} />
                <InfoRow icon="eye-outline" text={enrichedMatch.firstReferee} />
                <InfoRow icon="eye-outline" text={enrichedMatch.secondReferee} />
            </View>

            <BottomSheetCustomPage ref={poolSheetRef}>
                <BottomSheetView style={{ flex: 1 }}>
                    {selectedPoolId && <PoolContainer poolId={selectedPoolId} />}
                </BottomSheetView>
            </BottomSheetCustomPage>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 18,
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    poolLogo: {
        width: 22,
        height: 22,
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