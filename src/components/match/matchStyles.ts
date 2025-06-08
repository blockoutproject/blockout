// Nouveau fichier matchStyles.ts après refactor et centralisation des styles
import { StyleSheet } from "react-native";

const matchStyles = StyleSheet.create({
    // MatchScoreCard
    scoreCard: {
        paddingVertical: 16,
    },
    verticalContainer: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
    },
    teamRowContainer: {
        flexDirection: "row",
    },
    teamCard: {
        flex: 1,
        marginHorizontal: 12,
        alignItems: "center",
    },
    teamLogoLarge: {
        width: 90,
        height: 90,
        marginBottom: 4,
    },
    teamLabel: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    teamRoleLabel: {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 2,
    },
    centerBlock: {
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    finalScoreBox: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    finalScoreTextLarge: {
        fontSize: 28,
        fontWeight: "700",
    },
    timeText: {
        fontSize: 14,
        fontWeight: "600",
    },
    upcomingLabel: {
        fontSize: 14,
        fontWeight: "600",
    },
    dateText: {
        fontWeight: "700",
        fontSize: 14,
    },
    leagueLabel: {
        fontWeight: "600",
        fontSize: 14,
    },
    largeTimeText: {
        fontSize: 36,
        fontWeight: "700",
    },

    // MatchScoreDetailsCard
    scoreDetailsCard: {
        paddingHorizontal: 8,
    },
    scoreDetailsTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
    },
    scoreDetailsWrapper: {
        flexDirection: "column",
        gap: 10,
    },
    scoreDetailsTeamRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    teamLogoColumn: {
        width: 40,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 4,
    },
    teamNameColumn: {
        flex: 1,
        marginRight: 4,
    },
    finalScoreColumn: {
        width: 40,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 4,
    },
    setColumn: {
        width: 30,
        justifyContent: "center",
        alignItems: "center",
    },
    teamLogoSmall: {
        width: 36,
        height: 36,
    },
    shortTeamName: {
        fontWeight: "600",
        fontSize: 14,
    },
    scoreBox: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    setScoreText: {
        fontSize: 16,
    },
    finalScoreTextSmall: {
        fontSize: 16,
        fontWeight: "700",
    },

    // MatchInfoCard
    infoCard: {
        paddingHorizontal: 8,
    },
    infoCardTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
    },
    infoRowsWrapper: {
        flexDirection: 'column',
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    poolLogo: {
        width: 20,
        height: 20,
        marginRight: 12,
        borderRadius: 5,
    },
    poolTitleWrapper: {
        flex: 1,
    },
    poolTitleText: {
        fontSize: 14,
        fontWeight: '700',
    },
    icon: {
        marginRight: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
    },

    // MatchSkeleton
    skeletonContainer: {
        flex: 1,
    },

    // Match (Main screen)
    scrollContent: {
        gap: 32,
        paddingHorizontal: 8,
    },
});

export default matchStyles;
