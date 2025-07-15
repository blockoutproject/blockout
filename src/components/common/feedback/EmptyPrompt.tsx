import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider"; // 🌈 Hook thème
import { BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { useFocusEffect } from "@react-navigation/native";

type EmptyPromptProps = {
    title: string;
    subtitle: string;
    home?: boolean;
};

const EmptyPrompt: React.FC<EmptyPromptProps> = ({ 
    title, 
    subtitle, 
    home = false 
}) => {
    const theme = useAppTheme();

    const CustomView = home ? View : BottomSheetScrollView;

    return (
        <BottomSheetView focusHook={useFocusEffect} style={[styles.container, { backgroundColor: theme.background }]}>
            <Image
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/4076/4076549.png" }}
                style={[styles.image, { tintColor: theme.textInactive }]}
                resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: theme.textInactive }]}>{subtitle}</Text>
        </BottomSheetView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: 120,
        height: 120,
        marginBottom: 24,
        opacity: 0.8,
    },
    title: {
        fontSize: 22,
        fontWeight: "600",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
        maxWidth: 280,
        lineHeight: 22,
    },
});

export default EmptyPrompt;