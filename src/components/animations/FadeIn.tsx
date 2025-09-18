import React, { useEffect, useRef, PropsWithChildren } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

type FadeInProps = PropsWithChildren<{
    /** Démarre l’anim au montage. */
    playOnMount?: boolean;
    /** Rejoue l’anim si cette clé change (id, index, filtre, etc.). */
    triggerKey?: string | number | boolean;

    /** Durée (ms). */
    duration?: number;
    /** Délai (ms). */
    delay?: number;

    /** Opacité initiale et finale. */
    fromOpacity?: number;
    toOpacity?: number;

    /** Décalage Y initial et final. */
    fromTranslateY?: number;
    toTranslateY?: number;

    /** N’anime qu’une seule fois sur le cycle de vie (même si triggerKey change). */
    once?: boolean;
    /** Désactive l’anim et affiche directement l’état final. */
    disabled?: boolean;

    /** Stagger utilitaire : index * step + base. (S’ajoute à `delay`.) */
    appearIndex?: number;
    staggerBase?: number;
    staggerStep?: number;

    /** Style du conteneur Animated.View. */
    style?: StyleProp<ViewStyle>;
}>;

const FadeIn: React.FC<FadeInProps> = ({
    children,
    playOnMount = true,
    triggerKey,
    duration = 220,
    delay = 0,
    fromOpacity = 0,
    toOpacity = 1,
    fromTranslateY = 8,
    toTranslateY = 0,
    once = true,
    disabled = false,
    appearIndex = 0,
    staggerBase = 0,
    staggerStep = 60,
    style,
}) => {
    const opacity = useRef(new Animated.Value(disabled ? toOpacity : fromOpacity)).current;
    const translateY = useRef(new Animated.Value(disabled ? toTranslateY : fromTranslateY)).current;
    const hasAnimated = useRef(false);

    const effectiveDelay = staggerBase + appearIndex * staggerStep + delay;

    useEffect(() => {
        if (disabled) {
            opacity.setValue(toOpacity);
            translateY.setValue(toTranslateY);
            return;
        }

        const shouldRun = playOnMount || triggerKey !== undefined;
        if (!shouldRun) return;

        if (once && hasAnimated.current) return;
        hasAnimated.current = true;

        opacity.setValue(fromOpacity);
        translateY.setValue(fromTranslateY);

        Animated.parallel([
            Animated.timing(opacity, {
                toValue: toOpacity,
                duration,
                delay: effectiveDelay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: toTranslateY,
                duration,
                delay: effectiveDelay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [
        playOnMount,
        triggerKey,
        disabled,
        duration,
        effectiveDelay,
        fromOpacity,
        toOpacity,
        fromTranslateY,
        toTranslateY,
        once,
        opacity,
        translateY,
    ]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

export default FadeIn;