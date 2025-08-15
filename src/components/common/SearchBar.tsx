import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";

type SearchBarProps = {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onFocus?: () => void;
    onBlur?: () => void;
};

const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    placeholder = "Rechercher...",
    onFocus,
    onBlur,
}) => {
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons
                name="magnify"
                size={18}
                color={theme.textInactive}
                style={styles.icon}
            />
            <BottomSheetTextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.textInactive}
                onFocus={onFocus}
                onBlur={onBlur}
                style={[
                    styles.input,
                    {
                        color: theme.text,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 20,
    },
    icon: {
        marginHorizontal: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 14,
    },
});

export default SearchBar;