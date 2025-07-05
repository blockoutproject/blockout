import React from "react";
import { View, Text, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Pool } from "@/src/types/Pool";
import { Division } from "@/src/types/Division";
import FollowButton from "@/src/components/common/FollowButton";
import FollowersCounter from "@/src/components/common/FollowersCount";
import { usePoolFollowState } from "@/src/hooks/pool/usePoolFollowState";

type Props = { pool: Pool; division: Division };

const PoolProfile: React.FC<Props> = ({ pool, division }) => {
    const theme = useAppTheme();
    const { isFollowing, isProcessing, followersCount, onToggleFollow } =
        usePoolFollowState(pool);

    const gradient: readonly [string, string, ...string[]] = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.row}>
                <FastImage
                    source={{ uri: division.logoUrl || "" }}
                    style={styles.logo}
                    resizeMode="contain"
                />

                <View style={styles.info}>
                    <Text style={[styles.title, { color: theme.text }]}>{pool.name}</Text>

                    <View style={styles.infoLine}>
                        <MaterialCommunityIcons name="trophy-outline" size={18} color={theme.text} />
                        <Text style={[styles.infoText, { color: theme.text }]}>{division.name}</Text>
                    </View>

                    <View style={styles.infoLine}>
                        <MaterialCommunityIcons name="gender-male-female" size={18} color={theme.text} />
                        <Text style={[styles.infoText, { color: theme.text }]}>{pool.gender}</Text>
                    </View>

                    <View style={styles.infoLine}>
                        <MaterialCommunityIcons name="link-variant" size={18} color={theme.text} />
                        <Text style={[styles.linkText, { color: theme.text }]}>ligue-b-masculine.com</Text>
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
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    row: {
        flexDirection: "row",
        gap: 16,
    },
    logo: {
        width: 100,
        aspectRatio: 1,
        borderRadius: 16,
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
        gap: 10,
        marginBottom: 2,
    },
    infoText: {
        fontSize: 14,
    },
    linkText: {
        fontSize: 14,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 0,
        marginTop: 16,
    },
});