import React, { useRef, useMemo } from "react";
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    FlatList,
} from "react-native";
import { useDetailedTeamsByPool } from "@/src/hooks/pool/useDetailedTeamsByPool";
import FastImage from "react-native-fast-image";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { AppTheme } from "@/src/types/Theme";
import * as Haptics from "expo-haptics";
import TeamContainer from "../team/TeamScreen";

import { BottomSheetFlatList, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import BottomSheetCustomPage from "./BottomSheetCustomPage";
import { EnrichedPoolDTO, Pool } from "@/src/types/Pool";
import { Division } from "@/src/types/Division";

interface RankingCardProps {
    enrichedPool: EnrichedPoolDTO;
    scrollable?: boolean;
}

function getRowBg(isEven: boolean, theme: AppTheme) {
    return isEven ? theme.backgroundSecondary : "transparent";
}

const RankingCard: React.FC<RankingCardProps> = ({
    enrichedPool,
    scrollable = true,
}) => {
    const theme = useAppTheme();

    const division = enrichedPool.division;
    if (!division) {
        throw new Error("EnrichedPoolDTO.division is required but was undefined.");
    }

    const teamSheetRef = useRef<BottomSheetModal>(null);

    const openTeamSheet = (teamId: number) => {
        Haptics.selectionAsync();
        setSelectedTeam(teamId);
        teamSheetRef.current?.present();
    };
    const [selectedTeam, setSelectedTeam] = React.useState<number | null>(null);

    return (
        <>
            <View style={[styles.container, { backgroundColor: theme.background, borderColor: division.mainColor }]}>
                <View style={styles.headerRow}>
                    <View style={styles.transparentIndicator} />
                    {["#", "Team", "MJ", "V", "D", "PTS"].map((h, i) => (
                        <Text
                            key={h}
                            numberOfLines={1}
                            style={[
                                styles.headerText,
                                i === 1 ? styles.teamCell : i === 0 ? styles.rankCell : styles.statCell,
                                { color: theme.text },
                            ]}
                        >
                            {h}
                        </Text>
                    ))}
                </View>

                <BottomSheetFlatList
                    data={enrichedPool.ranking}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={scrollable}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => {
                        const rank = index + 1;
                        return (
                            <View
                                style={[
                                    styles.row,
                                    { backgroundColor: getRowBg(index % 2 === 0, theme) },
                                ]}
                            >
                                <View style={styles.transparentIndicator} />

                                <Text
                                    style={[styles.cell, styles.rankCell, { color: theme.text }]}
                                >
                                    {rank}
                                </Text>

                                <TouchableOpacity
                                    style={[styles.teamCell, styles.teamContainer]}
                                    onPress={() => openTeamSheet(item.id)}
                                >
                                    <FastImage
                                        source={require("@/assets/clubs/paris_volley.png")}
                                        style={styles.logo}
                                        resizeMode="contain"
                                    />
                                    <Text
                                        style={[styles.name, { color: theme.text }]}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.9}
                                    >
                                        {item.shortName}
                                    </Text>
                                </TouchableOpacity>

                                {[item.played, item.wins, item.losses, item.points].map(
                                    (v, idx) => (
                                        <Text
                                            key={idx}
                                            style={[styles.cell, styles.statCell, { color: theme.text }]}
                                        >
                                            {v}
                                        </Text>
                                    )
                                )}
                            </View>
                        );
                    }}
                />
            </View>

            <BottomSheetCustomPage ref={teamSheetRef}>
                <BottomSheetView style={{ flex: 1 }}>
                    {selectedTeam && <TeamContainer teamId={selectedTeam} />}
                </BottomSheetView>
            </BottomSheetCustomPage>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderRadius: 18,
        flexShrink: 1,
        padding: 8,
    },
    loadingText: { marginTop: 8 },
    errorText: { fontSize: 14 },
    headerRow: {
        height: 40,
        flexDirection: "row",
        alignItems: "center",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        height: 50,
    },
    transparentIndicator: { marginRight: 8 },
    headerText: { fontSize: 14, fontWeight: "700", textAlign: "center" },
    cell: { fontSize: 14, textAlign: "center" },
    rankCell: { flex: 0.4, textAlign: "left" },
    teamCell: { flex: 2.5, textAlign: "left" },
    statCell: { flex: 0.5 },
    teamContainer: { flexDirection: "row", alignItems: "center" },
    name: { marginLeft: 8, marginRight: 24, fontSize: 14 },
    logo: { width: 30, height: 30 },
});

export default RankingCard;