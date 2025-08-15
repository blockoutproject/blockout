import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ListRenderItemInfo,
    TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FlatList } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import type { EnrichedPoolDTO } from "@/src/types/Pool";
import type { SheetStackParamList } from "./BottomSheetNavigator";
import type { TeamHighlight } from "@/src/types/Team";
import { withAlpha } from "@/src/utils/utils";
import MaskedImage from "./MaskedImage";

interface RankingCardProps {
    enrichedPool: EnrichedPoolDTO;
    scrollable?: boolean;
    highlightTeams?: TeamHighlight[];
}

const RADIUS = 18;
const LOGO = 28;
const PTS_BADGE_RADIUS = 10;

const RankingCard: React.FC<RankingCardProps> = ({
    enrichedPool,
    scrollable = true,
    highlightTeams,
}) => {
    const theme = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<SheetStackParamList>>();

    const { division } = enrichedPool;
    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    const divisionLogo = division.logoUrl
        ? { uri: division.logoUrl }
        : require("@/assets/clubs/default_club_logo.png");

    const zebra = (even: boolean, color: string) => (even ? withAlpha(color, 0.2) : "transparent");

    const handleTeamPress = (teamId: number) => {
        Haptics.selectionAsync();
        navigation.push("Team", { teamId });
    };

    const handleHeaderPress = () => {
        Haptics.selectionAsync();
        navigation.push("Pool", { poolId: enrichedPool.id });
    };

    const Header = () => (
        <TouchableOpacity activeOpacity={0.85} onPress={handleHeaderPress}>
            <View style={styles.header}>
                <Image source={divisionLogo} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} />
                <LinearGradient
                    pointerEvents="none"
                    colors={[withAlpha(theme.surface, 0.9), withAlpha(theme.surface, 0.35), withAlpha(theme.surface, 0.9)]}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <MaskedImage
                            uri={division.logoUrl}
                            size={24}
                            radius={6}
                            shadow
                        />
                        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                            {division.name} - Classement
                        </Text>
                    </View>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={22}
                        color={withAlpha(theme.text, 0.8)}
                    />
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderItem = ({
        item,
        index,
    }: ListRenderItemInfo<EnrichedPoolDTO["ranking"][number]>) => {
        const rank = index + 1;
        const hl = highlightTeams?.find((h) => h.teamId === item.id);
        const bg = hl ? withAlpha(hl.color, 0.32) : zebra(index % 2 === 0, division.mainColor);

        return (
            <Pressable
                android_ripple={{ color: withAlpha(theme.text, 0.06) }}
                style={[styles.row, { backgroundColor: bg }]}
                onPress={() => handleTeamPress(item.id)}
            >
                <View style={styles.rankCell}>
                    {rank <= 3 ? (
                        <Medal rank={rank as 1 | 2 | 3} />
                    ) : (
                        <View style={[styles.rankCircle, { borderColor: withAlpha(theme.text, 0.25) }]}>
                            <Text style={[styles.rankText, { color: theme.text }]}>{rank}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.teamBlock}>
                    <MaskedImage
                        uri={item.logoUrl}
                        size={28}
                        radius={8}
                        shadow
                    />
                    <View style={styles.teamTextCol}>
                        <Text
                            style={[styles.teamName, { color: theme.text }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            adjustsFontSizeToFit
                            minimumFontScale={0.9}
                        >
                            {item.shortName}
                        </Text>

                        <View style={styles.metaRow}>
                            <MiniStat label="MJ" value={item.played} themeText={theme.text} themeBorder={withAlpha(theme.text, 0.2)} />
                            <MiniStat label="V" value={item.wins} themeText={theme.text} themeBorder={withAlpha(theme.text, 0.2)} />
                            <MiniStat label="D" value={item.losses} themeText={theme.text} themeBorder={withAlpha(theme.text, 0.2)} />
                        </View>
                    </View>
                </View>

                <GradientBorderView
                    gradient={gradient}
                    borderRadius={PTS_BADGE_RADIUS}
                    borderWidth={1}
                    style={[styles.pointsBadge, { backgroundColor: theme.background }]}
                >
                    <Text style={[styles.pointsText, { color: theme.text }]}>{item.points}</Text>
                </GradientBorderView>
            </Pressable>
        );
    };

    return (
        <GradientBorderView
            gradient={gradient}
            borderRadius={RADIUS}
            borderWidth={2}
            style={[styles.card, { backgroundColor: theme.background }]}
        >
            <FlatList
                data={enrichedPool.ranking}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                ListHeaderComponent={Header}
                stickyHeaderIndices={[0]}
                showsVerticalScrollIndicator={false}
                scrollEnabled={scrollable}
                contentContainerStyle={styles.listContent}
            />
        </GradientBorderView>
    );
};

export default RankingCard;

const Medal: React.FC<{ rank: 1 | 2 | 3 }> = ({ rank }) => {
    const color = rank === 1 ? "#FFD54F" : rank === 2 ? "#B0BEC5" : "#D4A373";
    return (
        <View style={[styles.medalWrap, { backgroundColor: withAlpha(color, 0.22), borderColor: color }]}>
            <MaterialCommunityIcons name="medal" size={14} color={color} />
            <Text style={styles.medalRank}>{rank}</Text>
        </View>
    );
};

const MiniStat: React.FC<{
    label: string;
    value: number | string;
    themeText: string;
    themeBorder: string;
}> = ({ label, value, themeText, themeBorder }) => (
    <View style={[styles.miniStat, { borderColor: themeBorder }]}>
        <Text style={[styles.miniStatLabel, { color: withAlpha(themeText, 0.7) }]}>{label}</Text>
        <Text style={[styles.miniStatValue, { color: themeText }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS,
        overflow: "hidden",
    },
    listContent: {
        paddingBottom: 8,
        gap: 6,
    },
    header: {
        position: "relative",
        overflow: "hidden",
        width: "100%",
    },
    headerRow: {
        paddingHorizontal: 10,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        flex: 1,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        marginHorizontal: 8,
        padding: 8,
        gap: 8,
    },
    rankCell: { width: 40, alignItems: "center", justifyContent: "center" },
    rankCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
    },
    rankText: { fontSize: 13, fontWeight: "800" },
    teamBlock: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
    },
    logo: { width: LOGO, aspectRatio: 1, borderRadius: 8 },
    teamTextCol: { flex: 1, gap: 4 },
    teamName: { fontSize: 14, fontWeight: "800" },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    miniStat: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
    },
    miniStatLabel: { fontSize: 11, fontWeight: "700" },
    miniStatValue: { fontSize: 12, fontWeight: "800" },
    pointsBadge: { width: 34, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: PTS_BADGE_RADIUS },
    pointsText: { fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
    medalWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
    },
    medalRank: { fontSize: 12, fontWeight: "800", color: "white" },
});