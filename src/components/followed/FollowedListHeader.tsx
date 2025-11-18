// src/components/followed/FollowedListHeader.tsx
import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Filters from "@/src/components/common/Filters";
import { Filter } from "@/src/types/Filter";
import { CORNERS } from "@/src/theme/globals";
import { useAppTheme } from "@/src/context/ThemeProvider";

type Props = {
    filters: Filter[];
    setFilters: (next: Filter[] | ((prev: Filter[]) => Filter[])) => void;
    headerOffset: number;
    seasonLabel: string;
    onPressSeason: () => void;
};

const FollowedListHeader: React.FC<Props> = ({
    filters,
    setFilters,
    headerOffset,
    seasonLabel,
    onPressSeason,
}) => {
    const theme = useAppTheme();

    const Spacer = useMemo(
        () => (
            <View
                style={{
                    height: headerOffset,
                    backgroundColor: theme.background,
                }}
            />
        ),
        [headerOffset, theme.background],
    );

    return (
        <View>
            {Spacer}

            <View style={styles.row}>
                <View style={styles.filtersWrap}>
                    <Filters
                        filters={filters}
                        setFilters={setFilters}
                        singleSelect
                        requireSelection
                        scrollable={false}
                        style={{
                            marginLeft: 4,
                            backgroundColor: "transparent",
                        }}
                        containerStyle={{
                            paddingVertical: 8,
                            marginBottom: 2,
                            borderRadius: CORNERS,
                            backgroundColor: theme.background,
                        }}
                    />
                </View>

                <TouchableOpacity
                    onPress={onPressSeason}
                    activeOpacity={0.8}
                    style={[
                        styles.seasonBtn,
                        {
                            borderColor: theme.border,
                            backgroundColor: theme.surface,
                        },
                    ]}
                    testID="followed-season-button"
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
            </View>
        </View>
    );
};

export default FollowedListHeader;

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingRight: 8,
    },
    filtersWrap: {
        flex: 1,
    },
    seasonBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: CORNERS,
        borderWidth: 1,
        marginLeft: 6,
        maxWidth: 150,
        gap: 6,
    },
    seasonText: {
        fontSize: 12,
        fontWeight: "700",
    },
});