import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { GradientVariants } from '@/src/utils/utils';

type GradientBorderViewProps = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    outerStyle?: StyleProp<ViewStyle>;
    borderRadius?: number;
    borderWidth?: number;
    gradient: GradientVariants;
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

    return (
        <LinearGradient
            colors={gradient.base}
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
            <View style={[{ backgroundColor: theme.backgroundSecondary, borderRadius: borderRadius - borderWidth }, style]}>
                {children}
            </View>
        </LinearGradient>
    );
};

export default GradientBorderView;