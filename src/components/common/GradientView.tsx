import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type GradientViewProps = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    gradient: readonly [string, string, ...string[]];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
};

const GradientView: React.FC<GradientViewProps> = ({
    children,
    style,
    gradient,
    start = { x: 0, y: 0 },
    end = { x: 1, y: 1 },
}) => {
    return (
        <LinearGradient
            colors={gradient}
            start={start}
            end={end}
            style={style}
        >
            {children}
        </LinearGradient>
    );
};

export default GradientView;