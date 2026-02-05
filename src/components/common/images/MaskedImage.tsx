import React, { memo } from "react";
import { View, StyleSheet, ViewStyle, StyleProp, Pressable } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/src/context/ThemeProvider";
import * as Haptics from "expo-haptics";

export type MaskedImageProps = {
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
    onPress?: () => void;
    onLoad?: () => void;
};

const MaskedImage: React.FC<MaskedImageProps> = memo(
    ({
        uri,
        fallback = require("@/assets/clubs/default_club_logo.png"),
        size,
        radius,
        backgroundColor,
        contentFit = "cover",
        borderWidth = 0,
        borderColor,
        shadow = false,
        style,
        onPress,
        onLoad,
    }) => {
        const theme = useAppTheme();
        const r = radius ?? Math.round(size * 0.28);

        const Container_logout = onPress ? Pressable : View;

        const handlePress = async () => {
            if (onPress) {
                await Haptics.selectionAsync();
                onPress();
            }
        };

        return (
            <View style={[shadow && styles.shadow]}>
                <Container_logout
                    onPress={handlePress}
                    style={[
                        {
                            width: size,
                            aspectRatio: 1,
                            borderRadius: r,
                            overflow: "hidden",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: backgroundColor ?? theme.text,
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
                        onLoad={onLoad}
                    />
                </Container_logout>
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