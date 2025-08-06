import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ListRenderItemInfo,
} from "react-native";
import { Image } from 'expo-image';
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { EnrichedPoolDTO } from "@/src/types/Pool";
import { FlatList } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SheetStackParamList } from "./BottomSheetNavigator";

interface RankingCardProps {
    enrichedPool: EnrichedPoolDTO;
    scrollable?: boolean;
}

const getRowBg = (isEven: boolean, mainColor: string) =>
    isEven ? `${mainColor}30` : "transparent";

const RankingCard: React.FC<RankingCardProps> = ({
    enrichedPool,
    scrollable = true,
}) => {
    const theme = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<SheetStackParamList>>();

    const handleTeamPress = (teamId: number) => {
        Haptics.selectionAsync();
        navigation.push('Team', { teamId });
    };

    const ListHeader = () => (
        <View style={[styles.headerRow, { backgroundColor: theme.background }]}>
            <View style={styles.transparentIndicator} />
            {["#", "Team", "MJ", "V", "D", "PTS"].map((h, i) => (
                <Text
                    key={h}
                    numberOfLines={1}
                    style={[
                        styles.headerText,
                        i === 1
                            ? styles.teamCell
                            : i === 0
                                ? styles.rankCell
                                : styles.statCell,
                        { color: theme.text },
                    ]}
                >
                    {h}
                </Text>
            ))}
        </View>
    );

    const renderItem = ({
        item,
        index,
    }: ListRenderItemInfo<EnrichedPoolDTO["ranking"][number]>) => {
        const rank = index + 1;
        return (
            <View
                style={[
                    styles.row,
                    {
                        backgroundColor: getRowBg(
                            index % 2 === 0,
                            enrichedPool.division.mainColor
                        ),
                    },
                ]}
            >
                <View style={styles.transparentIndicator} />
                <Text style={[styles.cell, styles.rankCell, { color: theme.text }]}>
                    {rank}
                </Text>

                <TouchableOpacity
                    style={[styles.teamCell, styles.teamContainer]}
                    onPress={() => handleTeamPress(item.id)}
                >
                    <Image
                        source={
                            item.logoUrl
                                ? { uri: item.logoUrl }
                                : require('@/assets/clubs/default_club_logo.png')
                        }
                        style={[styles.logo, { backgroundColor: theme.text }]}
                        contentFit="contain"
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

                {[item.played, item.wins, item.losses, item.points].map((v, idx) => (
                    <Text
                        key={idx}
                        style={[styles.cell, styles.statCell, { color: theme.text }]}
                    >
                        {v}
                    </Text>
                ))}
            </View>
        );
    };

    return (
        <>
            <View
                style={[
                    styles.container,
                    { backgroundColor: theme.background, borderColor: enrichedPool.division.mainColor }
                ]}>
                <FlatList
                    data={enrichedPool.ranking}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    ListHeaderComponent={ListHeader}
                    stickyHeaderIndices={[0]}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={scrollable}
                    contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
                />
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderRadius: 18,
        flexShrink: 1,
        overflow: "hidden",
    },
    headerRow: {
        height: 40,
        flexDirection: "row",
        alignItems: "center",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        height: 50
    },
    transparentIndicator: {
        marginRight: 8
    },
    headerText: {
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center"
    },
    cell: {
        fontSize: 14,
        textAlign: "center"
    },
    rankCell: {
        flex: 0.4,
        textAlign: "left"
    },
    teamCell: {
        flex: 2.5,
        textAlign: "left"
    },
    statCell: {
        flex: 0.5
    },
    teamContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    name: {
        marginLeft: 8,
        marginRight: 24,
        fontSize: 14
    },
    logo: {
        width: 30,
        aspectRatio: 1,
        borderRadius: 10,
    },
});

export default RankingCard;