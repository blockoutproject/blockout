import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/src/context/ThemeProvider';

type GradientBorderViewProps = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    outerStyle?: StyleProp<ViewStyle>;
    borderRadius?: number;
    borderWidth?: number;
    colorsOverride?: readonly [string, string, ...string[]];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
};

const colorPalettes: readonly [string, string, ...string[]][] = [
    // ['#7e30e1', '#fa3380', '#3c59ff'], // Palette 1 (originale)
    // ['#ff8a00', '#9b00e8', '#e52e71'], // Palette 2 (sunset vibes)
    ['#00f5a0',  '#0085ff', '#00d9f5'], // Palette 3 (aqua/cyber)
];

const GradientBorderView: React.FC<GradientBorderViewProps> = ({
    children,
    style,
    outerStyle,
    borderRadius = 18,
    borderWidth = 2,
    colorsOverride,
    start = { x: 0, y: 0 },
    end = { x: 0, y: 0.5 },
}) => {
    const theme = useAppTheme();

    const gradientColors = useMemo(() => {
        if (colorsOverride) return colorsOverride;
        const randomIndex = Math.floor(Math.random() * colorPalettes.length);
        return colorPalettes[randomIndex];
    }, [colorsOverride]);

    return (
        <LinearGradient
            colors={gradientColors}
            start={start}
            end={end}
            style={[
                {
                    borderRadius,
                    padding: borderWidth,
                },
                outerStyle,
            ]}
        >
            <View style={[{ backgroundColor: theme.background, borderRadius: borderRadius - borderWidth }, style]}>
                {children}
            </View>
        </LinearGradient>
    );
};

export default GradientBorderView;