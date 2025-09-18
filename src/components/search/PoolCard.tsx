import React from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { PoolSearchDoc } from "@/src/types/docs/PoolSearchDoc";
import { Image } from "expo-image";

/** Card for a pool row. */
export type PoolCardProps = {
    /** Pool data. */
    pool: PoolSearchDoc;
    /** Press handler. */
    onPress: () => void;
};

const PoolCard: React.FC<PoolCardProps> = ({ pool, onPress }) => {
    const theme = useAppTheme();

    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.card,
                {
                    backgroundColor: theme.surface,
                    shadowColor: theme.background,
                },
            ]}
            testID="pool-card"
        >
            <Image
                source={
                    pool.logoUrl
                        ? { uri: pool.logoUrl }
                        : require("@/assets/clubs/default_club_logo.png")
                }
                style={[
                    styles.logo,
                    {
                        backgroundColor: theme.text,
                    },
                ]}
                contentFit="contain"
            />

            <View
                style={styles.content}
            >
                <Text
                    style={[
                        styles.name,
                        {
                            color: theme.text,
                        },
                    ]}
                >
                    {pool.name}
                </Text>
                <Text
                    style={[
                        styles.details,
                        {
                            color: theme.textInactive,
                        },
                    ]}
                >
                    {pool.divisionName} • {pool.leagueName} • {pool.season}
                </Text>
            </View>
        </Pressable>
    );
};

export default PoolCard;

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        marginBottom: 12,
        borderRadius: 20,
    },
    logo: {
        aspectRatio: 1,
        marginRight: 16,
        height: 50,
        borderRadius: 12,
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: "600",
    },
    details: {
        marginTop: 4,
    },
});