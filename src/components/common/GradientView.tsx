import { ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientVariants } from '@/src/utils/utils';

type GradientViewProps = {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    gradient: GradientVariants;
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
            colors={gradient.base}
            start={start}
            end={end}
            style={style}
        >
            {children}
        </LinearGradient>
    );
};

export default GradientView;