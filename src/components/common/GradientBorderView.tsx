import React from "react";
import { View, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/src/context/ThemeProvider";

type GradientBorderViewProps = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    outerStyle?: StyleProp<ViewStyle>;
    borderRadius?: number;
    borderWidth?: number;
    gradient: readonly [string, string, ...string[]];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
};

const GradientBorderView: React.FC<GradientBorderViewProps> = ({
    children,
    style,
    outerStyle,
    borderRadius = 18,
    borderWidth = 2,
    gradient,
    start = { x: 0, y: 0 },
    end = { x: 1, y: 1 },
}) => {
    const theme = useAppTheme();
    const innerRadius = Math.max(0, borderRadius - borderWidth);

    return (
        <View style={[{ borderRadius, overflow: "hidden" }, outerStyle]}>
            <LinearGradient
                colors={gradient}
                start={start}
                end={end}
                style={{ borderRadius }}
            >
                <View
                    style={[
                        {
                            margin: borderWidth,
                            borderRadius: innerRadius,
                            backgroundColor: theme.backgroundSecondary,
                        },
                        style,
                    ]}
                >
                    {children}
                </View>
            </LinearGradient>
        </View>
    );
};

export default GradientBorderView;