import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT, CORNERS } from "@/src/theme/globals";
import { useBackOrClose } from "@/src/hooks/utils/useBackOrClose";

export type TeamListHeaderProps = {
    title: string;
    onOpenReport: () => void;
    seasonLabel?: string;
    onPressSeason?: () => void;
};

const TeamListHeader: React.FC<TeamListHeaderProps> = ({
    title,
    onOpenReport,
    seasonLabel,
    onPressSeason,
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { handleBack, canGoBack } = useBackOrClose();

    const showSeasonSelector = !!seasonLabel && !!onPressSeason;

    return (
        <View
            style={[
                {
                    paddingTop: insets.top,
                },
            ]}
        >
            <View style={styles.header}>
                <View style={styles.leftGroup}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}
                    >
                        <Ionicons
                            name={canGoBack ? "chevron-back-outline" : "close"}
                            size={25}
                            color={theme.text}
                        />
                    </TouchableOpacity>

                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.text,
                            },
                        ]}
                        adjustsFontSizeToFit
                        numberOfLines={2}
                        lineBreakStrategyIOS="push-out"
                        textBreakStrategy="highQuality"
                    >
                        {title}
                    </Text>
                </View>

                <View style={styles.rightGroup}>
                    {showSeasonSelector && (
                        <TouchableOpacity
                            onPress={onPressSeason}
                            activeOpacity={0.7}
                            style={[
                                styles.seasonBtn,
                                {
                                    borderColor: theme.border,
                                    backgroundColor: theme.surface,
                                },
                            ]}
                            testID="team-list-season-button"
                        >
                            <MaterialCommunityIcons
                                name="calendar-month-outline"
                                size={16}
                                color={theme.textInactive}
                            />
                            <Text
                                style={[
                                    styles.seasonText,
                                    { color: theme.text },
                                ]}
                                numberOfLines={1}
                            >
                                {seasonLabel}
                            </Text>
                            <MaterialCommunityIcons
                                name="chevron-down"
                                size={16}
                                color={theme.textInactive}
                            />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={onOpenReport}
                        hitSlop={{
                            top: 10,
                            bottom: 10,
                            left: 10,
                            right: 10,
                        }}
                        style={styles.iconBtn}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="flag-outline"
                            size={28}
                            color={theme.text}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default TeamListHeader;

const styles = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
    },
    header: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
    },
    leftGroup: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    backButton: {
        marginRight: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: "900",
        flexShrink: 1,
    },
    rightGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    iconBtn: {
        padding: 4,
    },
    seasonBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: CORNERS,
        borderWidth: 1,
        gap: 6,
        maxWidth: 150,
    },
    seasonText: {
        fontSize: 12,
        fontWeight: "700",
    },
});