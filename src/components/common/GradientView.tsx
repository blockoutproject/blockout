import { ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/src/context/ThemeProvider';

type GradientViewProps = {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    colorsOverride?: readonly [string, string, ...string[]]; // Si tu veux forcer d'autres couleurs
    start?: { x: number; y: number };
    end?: { x: number; y: number };
};

const GradientView: React.FC<GradientViewProps> = ({
    children,
    style,
    colorsOverride,
    start = { x: 0, y: 1 },
    end = { x: 0, y: 0 },
}) => {
    const theme = useAppTheme();
    const colors = colorsOverride ?? [ theme.surface, theme.surfaceSecondary ];

    return (
        <LinearGradient
            colors={colors}
            start={start}
            end={end}
            style={style}
        >
            {children}
        </LinearGradient>
    );
};

export default GradientView;