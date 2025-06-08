import { StyleSheet } from "react-native";

export const teamStyles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 8,
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