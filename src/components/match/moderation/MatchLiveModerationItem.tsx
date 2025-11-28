import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { EnrichedMatchLiveSummaryDTO } from "@/src/types/Match";
import MaskedImage from "../../common/images/MaskedImage";

type Props = {
    match: EnrichedMatchLiveSummaryDTO;
    onPress: () => void;
};

const MatchLiveModerationItem: React.FC<Props> = ({ match, onPress }) => {
    const theme = useAppTheme();

    const teamALabel = match.teamA.shortName ?? match.teamA.name;
    const teamBLabel = match.teamB.shortName ?? match.teamB.name;

    const matchDateLabel = useMemo(() => {
        if (!match.matchDate) return "-";
        try {
            return new Date(match.matchDate).toLocaleString();
        } catch {
            return match.matchDate;
        }
    }, [match.matchDate]);

    const lastLinkCreatedLabel = useMemo(() => {
        if (!match.lastLiveLinkCreatedAt) return "";
        try {
            return new Date(match.lastLiveLinkCreatedAt).toLocaleString();
        } catch {
            return match.lastLiveLinkCreatedAt;
        }
    }, [match.lastLiveLinkCreatedAt]);

    const statusConfig = useMemo(() => {
        switch (match.lastLiveLinkStatus) {
            case "PENDING":
                return {
                    label: "En attente",
                    bg: theme.surfaceSecondary ?? theme.surface,
                    color: theme.warning ?? theme.text,
                };
            case "ACTIVE":
                return {
                    label: "Actif",
                    bg: theme.surfaceSecondary ?? theme.surface,
                    color: theme.success,
                };
            case "REJECTED":
                return {
                    label: "Rejeté",
                    bg: theme.surfaceSecondary ?? theme.surface,
                    color: theme.error,
                };
            case "HIDDEN":
                return {
                    label: "Supprimé",
                    bg: theme.borderSecondary,
                    color: theme.textInactive,
                };
            case "EXPIRED":
                return {
                    label: "Expiré",
                    bg: theme.borderSecondary,
                    color: theme.textInactive,
                };
            default:
                return {
                    label: "Inconnu",
                    bg: theme.borderSecondary,
                    color: theme.textInactive,
                };
        }
    }, [match.lastLiveLinkStatus, theme]);

    const handlePress = async () => {
        await Haptics.selectionAsync();
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.85}
            style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
        >
            {/* Ligne 1 : compétition + statut + chevron */}
            <View style={styles.topRow}>
                <View style={styles.compBlock}>
                    <Text
                        style={[styles.meta, { color: theme.text }]}
                        numberOfLines={1}
                    >
                        {match.pool.shortName} · {match.pool.division.name}
                    </Text>
                    <Text
                        style={[styles.metaSub, { color: theme.textInactive }]}
                        numberOfLines={1}
                    >
                        {match.pool.leagueName} · {match.season}
                    </Text>
                </View>

                <View style={styles.rightTop}>
                    {match.lastLiveLinkStatus && (
                        <View
                            style={[
                                styles.statusPill,
                                { backgroundColor: statusConfig.bg },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusText,
                                    { color: statusConfig.color },
                                ]}
                            >
                                {statusConfig.label}
                            </Text>
                        </View>
                    )}
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={22}
                        color={theme.textInactive}
                    />
                </View>
            </View>

            {/* Ligne 2 : équipes */}
            <View style={styles.teamsRow}>
                <View style={styles.teamSide}>
                    <MaskedImage
                        uri={match.teamA.logoUrl}
                        size={32}
                        radius={10}
                        shadow
                    />
                    <Text
                        style={[styles.teamName, { color: theme.text }]}
                        numberOfLines={1}
                    >
                        {teamALabel}
                    </Text>
                </View>

                <View style={styles.vsBlock}>
                    <Text
                        style={[styles.vsText, { color: theme.textInactive }]}
                    >
                        vs
                    </Text>
                </View>

                <View style={styles.teamSide}>
                    <Text
                        style={[styles.teamName, { color: theme.text }]}
                        numberOfLines={1}
                    >
                        {teamBLabel}
                    </Text>
                    <MaskedImage
                        uri={match.teamB.logoUrl}
                        size={32}
                        radius={10}
                        shadow
                    />
                </View>
            </View>

            {/* Ligne 3 : score / set */}
            {(match.set || match.score) && (
                <Text style={[styles.setScore, { color: theme.text }]}>
                    {match.set && `Set : ${match.set}`}
                    {match.set && match.score ? "   •   " : ""}
                    {match.score && `Score : ${match.score}`}
                </Text>
            )}

            {/* Ligne 4 : dates */}
            <View style={styles.datesRow}>
                <View style={styles.dateItem}>
                    <MaterialCommunityIcons
                        name="clock-outline"
                        size={14}
                        color={theme.textInactive}
                    />
                    <Text
                        style={[styles.dateText, { color: theme.textInactive }]}
                        numberOfLines={1}
                    >
                        Match : {matchDateLabel}
                    </Text>
                </View>

                {lastLinkCreatedLabel !== "" && (
                    <View style={styles.dateItem}>
                        <MaterialCommunityIcons
                            name="video-outline"
                            size={14}
                            color={theme.textInactive}
                        />
                        <Text
                            style={[
                                styles.dateText,
                                { color: theme.textInactive },
                            ]}
                            numberOfLines={1}
                        >
                            Dernier lien : {lastLinkCreatedLabel}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

export default MatchLiveModerationItem;

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1.5,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        gap: 8,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    compBlock: {
        flex: 1,
        paddingRight: 8,
    },
    meta: {
        fontSize: 13,
        fontWeight: "600",
    },
    metaSub: {
        fontSize: 11,
    },
    rightTop: {
        flexDirection: "row",
        alignItems: "center",
        columnGap: 8,
    },
    statusPill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: "700",
    },
    // Teams
    teamsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    teamSide: {
        flexDirection: "row",
        alignItems: "center",
        columnGap: 8,
    },
    vsBlock: {
        paddingHorizontal: 8,
    },
    vsText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    teamName: {
        fontSize: 14,
        fontWeight: "600",
        flexShrink: 1,
    },
    // Score
    setScore: {
        fontSize: 12,
        fontWeight: "500",
        marginTop: 4,
    },
    // Dates
    datesRow: {
        marginTop: 4,
        gap: 2,
    },
    dateItem: {
        flexDirection: "row",
        alignItems: "center",
        columnGap: 6,
    },
    dateText: {
        fontSize: 11,
        flexShrink: 1,
    },
});