import { StyleSheet } from "react-native";

export const matchListStyles = StyleSheet.create({
    // MatchCard
    matchCard: {
        flexDirection: "row",
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 8,
        gap: 2,
    },
    teamSide: {
        flex: 3,
        flexDirection: "row",
        alignItems: "center",
    },
    teamAlignRight: {
        justifyContent: "flex-end",
    },
    teamAlignLeft: {
        justifyContent: "flex-start",
    },
    teamLogo: {
        width: 35,
        height: 35,
    },
    teamName: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
        flex: 1,
    },
    centerBlock: {
        justifyContent: "center",
        alignItems: "center",
    },
    scoreBadge: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    scoreText: {
        fontSize: 22,
        fontWeight: "700",
    },
    timeText: {
        fontSize: 16,
        fontWeight: "600",
    },

    // PoolItem
    poolContainer: {
        borderRadius: 18,
        padding: 10,
    },
    poolHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    poolLogo: {
        width: 22,
        height: 22,
        marginRight: 8,
        borderRadius: 8,
    },
    poolTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
    },
    matchList: {
        flexDirection: "column",
        gap: 12,
    },

    // PoolItemSkeleton
    skeletonContainer: {
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
    },
    skeletonHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 8,
    },
    skeletonMatch: {
        flexDirection: "column",
        gap: 12,
    },

    // MatchListContainer
    loadingContainer: {
        flex: 1,
    },
    sectionListContent: {
        paddingBottom: 8,
    },
    itemSeparator: {
        height: 16,
    },
    sectionSeparator: {
        height: 6,
    },
    dateContainer: {
        backgroundColor: "transparent",
        alignItems: "center",
    },
    dateBackground: {
        borderRadius: 14,
        paddingVertical: 4,
        paddingHorizontal: 8,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 5,
        elevation: 5,
    },
    dateHeader: {
        fontSize: 14,
        fontWeight: "800",
    },
});