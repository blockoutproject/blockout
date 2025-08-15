import React, { memo } from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/src/context/ThemeProvider";

type Props = {
    uri?: string | null;
    fallback?: any;
    size: number;
    radius?: number;
    backgroundColor?: string;
    contentFit?: "contain" | "cover";
    borderWidth?: number;
    borderColor?: string;
    shadow?: boolean;
    style?: StyleProp<ViewStyle>;
};

const MaskedImage: React.FC<Props> = memo(
    ({
        uri,
        fallback = require("@/assets/clubs/default_club_logo.png"),
        size,
        radius,
        backgroundColor,
        contentFit = "contain",
        borderWidth = 0,
        borderColor,
        shadow = false,
        style,
    }) => {
        const theme = useAppTheme();
        const r = radius ?? Math.round(size * 0.28);

        return (
            <View style={[shadow && styles.shadow]}>
                <View
                    style={[
                        {
                            width: size,
                            aspectRatio: 1,
                            borderRadius: r,
                            overflow: "hidden",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: backgroundColor ?? theme.text, // underlayer for transparent logos
                            borderWidth,
                            borderColor: borderColor ?? "transparent",
                        },
                        style,
                    ]}
                >
                    <Image
                        source={uri ? { uri } : fallback}
                        style={{ width: "100%", height: "100%" }}
                        contentFit={contentFit}
                    />
                </View>
            </View>
        );
    }
);

export default MaskedImage;

const styles = StyleSheet.create({
    shadow: {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
});