import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import { useAppTheme } from "@/src/context/ThemeProvider";

type SearchResultItemProps = {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    onPress: () => void;
};

const SearchResultItem: React.FC<SearchResultItemProps> = ({ title, subtitle, imageUrl, onPress }) => {
    const theme = useAppTheme();

    return (
        <TouchableOpacity style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} onPress={onPress}>
            {imageUrl && (
                <FastImage
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="contain"
                />
            )}
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={[styles.subtitle, { color: theme.textInactive }]} numberOfLines={1}>
                        {subtitle}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    image: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
});

export default SearchResultItem;
