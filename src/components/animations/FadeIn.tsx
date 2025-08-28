import React, { useEffect, useRef, PropsWithChildren } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

type FadeInProps = PropsWithChildren<{
    /** Démarre l’anim au montage. */
    playOnMount?: boolean;
    /** Permet de rejouer l’anim si cette clé change (ex: id, index, filtre, etc.). */
    triggerKey?: string | number | boolean;

    /** Durée de l’animation (ms). */
    duration?: number;
    /** Délai avant démarrage (ms). */
    delay?: number;

    /** Opacité initiale et finale. */
    fromOpacity?: number;
    toOpacity?: number;

    /** Décalage vertical de départ (ex: 8px vers le bas) et d’arrivée. */
    fromTranslateY?: number;
    toTranslateY?: number;

    /** N’anime qu’une seule fois sur le cycle de vie (même si triggerKey change). */
    once?: boolean;
    /** Désactive l’anim et affiche directement l’état final. */
    disabled?: boolean;

    /** Stagger utilitaire : index * step + base. (S’applique en plus de `delay`.) */
    appearIndex?: number;
    staggerBase?: number;
    staggerStep?: number;

    /** Style supplémentaire sur le conteneur Animated.View. */
    style?: StyleProp<ViewStyle>;
}>;

/**
 * FadeIn — enveloppe vos éléments et applique une anim "opacity + translateY".
 * Usage:
 * <FadeIn appearIndex={i}><MyRow /></FadeIn>
 */
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

    const effectiveDelay = (staggerBase + appearIndex * staggerStep) + delay;

    useEffect(() => {
        if (disabled) {
            // Snap direct à l’état final
            opacity.setValue(toOpacity);
            translateY.setValue(toTranslateY);
            return;
        }

        if (!playOnMount) return;

        if (once && hasAnimated.current) return;

        hasAnimated.current = true;

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
    }, [playOnMount, triggerKey, disabled, duration, effectiveDelay, toOpacity, toTranslateY, once]);

    return (
        <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
            {children}
        </Animated.View>
    );
};

export default FadeIn;