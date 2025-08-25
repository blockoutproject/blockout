import React from "react";
import { View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { SEARCHBAR_HEIGHT } from "@/src/theme/globals";

type SearchBarProps = {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    inSheet?: boolean;
};

const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    placeholder = "Rechercher...",
    onFocus,
    onBlur,
    inSheet = true,
}) => {
    const theme = useAppTheme();
    const Input = inSheet ? BottomSheetTextInput : TextInput;

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons
                name="magnify"
                size={18}
                color={theme.textInactive}
                style={styles.icon}
            />
            <Input
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.textInactive}
                onFocus={onFocus}
                onBlur={onBlur}
                style={[
                    styles.input,
                    { color: theme.text, flex: 1 }
                ]}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText("")}>
                    <MaterialCommunityIcons
                        name="close-circle"
                        size={18}
                        color={theme.textInactive}
                        style={styles.clearIcon}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 20,
        height: SEARCHBAR_HEIGHT,
        paddingRight: 6,
    },
    icon: {
        marginLeft: 12,
    },
    input: {
        fontSize: 14,
    },
    clearIcon: {
        marginRight: 8,
    },
});

export default SearchBar;