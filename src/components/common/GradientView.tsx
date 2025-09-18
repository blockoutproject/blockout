import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export type GradientViewProps = {
    /** Contenu enfant */
    children: React.ReactNode;
    /** Style du conteneur */
    style?: StyleProp<ViewStyle>;
    /** Couleurs du dégradé */
    gradient: readonly [string, string, ...string[]];
    /** Point de départ du dégradé */
    start?: { x: number; y: number };
    /** Point d’arrivée du dégradé */
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