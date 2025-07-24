import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from 'expo-image';
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { EnrichedPoolDTO, Pool } from "@/src/types/Pool";
import FollowButton from "@/src/components/common/FollowButton";
import FollowersCounter from "@/src/components/common/FollowersCount";
import { usePoolFollowState } from "@/src/hooks/pool/usePoolFollowState";
import { EnumGender, GenderLabels } from "@/src/types/enums/Gender";
import { FormatLabels } from "@/src/types/enums/Format";

type Props = {
    enrichedPool: EnrichedPoolDTO
};

const PoolProfile: React.FC<Props> = ({ enrichedPool }) => {
    const theme = useAppTheme();
    const { isFollowing, isProcessing, followersCount, onToggleFollow } = usePoolFollowState(enrichedPool);

    const division = enrichedPool.division;
    if (!division) {
        throw new Error("EnrichedPoolDTO.division is required but was undefined.");
    }

    const gradient: readonly [string, string, ...string[]] = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.row}>
                <Image
                    source={{ uri: division.logoUrl || "" }}
                    style={[styles.logo, { backgroundColor: theme.text }]}
                    contentFit="contain"
                />

                <View style={styles.info}>
                    <Text
                        style={[styles.title, { color: theme.text }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                    >
                        {enrichedPool.name}
                    </Text>

                    <View style={styles.infoLine}>
                        <MaterialCommunityIcons name="trophy" size={18} color={theme.text} />
                        <Text style={[styles.infoText, { color: theme.text }]}>{division.name}</Text>
                    </View>

                    <View style={styles.infoLine}>
                        {enrichedPool.gender === EnumGender.M && <MaterialCommunityIcons name="gender-male" size={18} color={theme.text} />}
                        {enrichedPool.gender === EnumGender.F && <MaterialCommunityIcons name="gender-female" size={18} color={theme.text} />}
                        {enrichedPool.gender === EnumGender.O && <MaterialCommunityIcons name="gender-male-female" size={18} color={theme.text} />}
                        <Text style={[styles.infoText, { color: theme.text }]}>{GenderLabels[enrichedPool.gender]}</Text>
                    </View>

                    <View style={styles.infoLine}>
                        <MaterialCommunityIcons name="calendar" size={18} color={theme.text} />
                        <Text style={[styles.infoText, { color: theme.text }]}>{enrichedPool.season}</Text>
                    </View>

                    <View style={styles.infoLine}>
                        <MaterialCommunityIcons name="account-supervisor" size={18} color={theme.text} />
                        <Text style={[styles.linkText, { color: theme.text }]}>{FormatLabels[enrichedPool.format]}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.actionsRow}>
                <FollowButton
                    isFollowing={isFollowing}
                    onPress={onToggleFollow}
                    disabled={isProcessing}
                    gradient={gradient}
                />
                <FollowersCounter count={followersCount} />
            </View>
        </View>
    );
};

export default PoolProfile;

const styles = StyleSheet.create({
    container: {
        paddingTop: 8,
        paddingHorizontal: 16,
    },
    row: {
        flexDirection: "row",
        gap: 16,
    },
    logo: {
        width: 100,
        aspectRatio: 1,
        borderRadius: 24
    },
    info: {
        flex: 1,
        justifyContent: "center",
    },
    title: {
        fontWeight: "700",
        fontSize: 20,
        marginBottom: 10,
    },
    infoLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 2,
    },
    infoText: {
        fontSize: 14,
        fontWeight: '500',
    },
    linkText: {
        fontSize: 14,
        fontWeight: '500',
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 0,
        marginTop: 16,
    },
});