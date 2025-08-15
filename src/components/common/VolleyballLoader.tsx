import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, Text } from "react-native";

type Props = {
    label?: string;
    size?: number;
    durationMs?: number;
};

export default function VolleyballLoader({
    label = "Chargement…",
    size = 80,
    durationMs = 2000,
}: Props) {
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: durationMs,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [spinAnim, durationMs]);

    const rotate = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <View style={styles.container}>
            <Animated.Image
                source={require("@/assets/images/splash-icon-dark.png")}
                style={[
                    styles.image,
                    { width: size, height: size, transform: [{ rotate }] },
                ]}
            />
            <Text style={styles.text}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000", // ou transparent si overlay
        paddingHorizontal: 24,
    },
    image: {
        resizeMode: "contain",
    },
    text: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: "600",
        color: "#FFF",
        textAlign: "center",
        opacity: 0.85,
    },
});