import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from "react-native";
import * as Haptics from "expo-haptics";
import { Filter } from "@/src/types/Filter";
import { useAppTheme } from "@/src/context/ThemeProvider";

export type FiltersProps = {
    /** Tableau des filtres */
    filters: Filter[];
    /** Setter de l’état des filtres */
    setFilters: (updated: Filter[]) => void;
    /** Sélection unique */
    singleSelect?: boolean;
    /** Au moins un filtre actif requis */
    requireSelection?: boolean;
    /** Style du conteneur */
    containerStyle?: StyleProp<ViewStyle>;
    /** Taille des chips */
    size?: "sm" | "md";
    /** Autorise le scroll horizontal */
    scrollable?: boolean;
};

const Filters: React.FC<FiltersProps> = ({
    filters,
    setFilters,
    singleSelect = false,
    requireSelection = false,
    containerStyle,
    size = "md",
    scrollable = true,
}) => {
    const theme = useAppTheme();

    const dims = useMemo(() => {
        if (size === "sm") {
            return {
                padV: 7,
                padH: 12,
                fontSize: 13,
                gap: 8,
            };
        }
        return {
            padV: 9,
            padH: 14,
            fontSize: 14,
            gap: 10,
        };
    }, [size]);

    const toggleFilter = async (index: number) => {
        const updated = [...filters];

        if (singleSelect) {
            const alreadyActive = updated[index].isActive;
            const isLastActive = updated.filter((f) => f.isActive).length === 1 && alreadyActive;
            if (requireSelection && isLastActive) return;
            updated.forEach((f) => (f.isActive = false));
            if (!alreadyActive) {
                updated[index].isActive = true;
            }
        } else {
            updated[index].isActive = !updated[index].isActive;
        }

        setFilters(updated);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const renderItem = ({ item, index }: { item: Filter; index: number }) => {
        const active = item.isActive;
        return (
            <Pressable
                onPress={() => toggleFilter(index)}
                style={({ pressed }) => [
                    styles.chip,
                    {
                        paddingVertical: dims.padV,
                        paddingHorizontal: dims.padH,
                        backgroundColor: active ? theme.primary : theme.backgroundSecondary,
                        borderColor: active ? theme.primary : theme.border,
                        opacity: pressed ? 0.9 : 1,
                    },
                ]}
            >
                <Text
                    style={{
                        fontSize: dims.fontSize,
                        fontWeight: "600",
                        color: theme.text,
                        letterSpacing: 0.2,
                    }}
                >
                    {item.name}
                </Text>
            </Pressable>
        );
    };

    return (
        <View
            style={[
                {
                    paddingHorizontal: 8,
                },
                containerStyle,
            ]}
        >
            <FlatList
                data={filters}
                keyExtractor={(item) => item.name}
                renderItem={renderItem}
                horizontal
                scrollEnabled={scrollable}
                keyboardShouldPersistTaps="always"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.row,
                    {
                        columnGap: dims.gap,
                    },
                ]}
            />
        </View>
    );
};

export default Filters;

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    chip: {
        borderRadius: 999,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
});