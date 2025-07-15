import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import ClubTabs from "./components/ClubTabs";
import ClubProfile from "./components/ClubProfile";

type Props = {
    clubId: string;
};

const ClubScreen: React.FC<Props> = ({ clubId }) => {
    const theme = useAppTheme();



    return (
        <View style={[styles.container]}>
            
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    statRow: {
        flexDirection: "row",
        gap: 16,
        alignItems: "center",
        marginBottom: 12,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    badgeText: {
        fontWeight: "600",
        fontSize: 14,
    },
    tabContainer: {
        marginTop: 8,
        paddingBottom: 16,
    },
});

export default ClubScreen;