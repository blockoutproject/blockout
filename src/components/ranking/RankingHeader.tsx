import React from "react";
import { TouchableOpacity, View, Text, StyleSheet, StyleSheet as RNStyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import MaskedImage from "../common/images/MaskedImage";
import { isRegional, withAlpha } from "@/src/utils/utils";
import { EnrichedPoolDTO } from "@/src/types/Pool";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { GenderLabels } from "@/src/types/enums/Gender";

type Props = {
    pool: EnrichedPoolDTO;
    onPress: () => void;
};

const RankingHeader: React.FC<Props> = ({ pool, onPress }) => {
    const theme = useAppTheme();
    const divisionLogo = pool.division.logoUrl
        ? { uri: pool.division.logoUrl }
        : require("@/assets/clubs/default_club_logo.png");

    const isReg = isRegional(pool.leagueCode);

    return (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
            <Image
                source={divisionLogo}
                style={RNStyleSheet.absoluteFill}
                contentFit="cover"
                blurRadius={60}
                transition={0}
            />
            <LinearGradient
                pointerEvents="none"
                colors={[
                    withAlpha(theme.surface, 0.8),
                    withAlpha(theme.surface, 0.5),
                    withAlpha(theme.surface, 0.8),
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={RNStyleSheet.absoluteFill}
            />
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <MaskedImage uri={pool.division.logoUrl} size={26} radius={6} shadow />
                    <View style={{ flex: 1 }}>
                        <Text
                            style={[
                                styles.headerTitle,
                                { color: theme.text }
                            ]}
                            adjustsFontSizeToFit
                            lineBreakStrategyIOS="push-out"
                            textBreakStrategy="highQuality"
                            numberOfLines={2}
                        >
                            {pool.shortName}
                        </Text>
                        <Text
                            style={[
                                styles.divisionTitle,
                                {
                                    color: theme.textSecondary,
                                },
                            ]}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            {`${isReg ? `${pool.leagueName} • ` : ''}${pool.division.name} • ${GenderLabels[pool.gender]}`}
                        </Text>
                    </View>
                </View>
                <Ionicons
                    name="chevron-forward-outline"
                    size={22}
                    color={withAlpha(theme.text, 0.8)}
                />
            </View>
        </TouchableOpacity>
    );
};

export default RankingHeader;

const styles = StyleSheet.create({
    headerRow: {
        paddingHorizontal: 10,
        paddingVertical: 10,
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
        fontWeight: "800",
        flexShrink: 1,
    },
    divisionTitle: {
        flex: 1,
        fontSize: 11,
        fontWeight: "600",
    },
});