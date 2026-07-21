import React, {useEffect, useMemo, useRef} from "react";
import {Animated, StyleSheet, Text, ViewStyle} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {BOTTOM_TABBAR_HEIGHT} from "@/src/shared/theme/globals";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {withAlpha} from "@/src/utils/utils";
import {useKeyboardVisible} from "@/src/shared/hooks/useKeyboardVisible";

type ApiErrorToastProps = {
  /** Le message d'erreur à afficher. Null/undefined => caché */
  message?: string | null;
  /** Décalage depuis le bas (typiquement FOOTER_HEIGHT + padding bottom extérieur) */
  bottomOffset?: number;
  /** Masquage auto (ms). Mettre 0 pour désactiver l’auto-hide. */
  autoHideMs?: number;
  /** Callback quand l’animation de hide est terminée (utile pour clear le state parent) */
  onHidden?: () => void;
  /** Style externe optionnel (ex: pour modifier left/right). */
  containerStyle?: ViewStyle;
};

/**
 * Petit toast animé pour afficher une erreur API.
 * - Fade + translateY
 * - Auto-hide configurable
 * - Couleurs via theme
 */
const ApiErrorToast: React.FC<ApiErrorToastProps> = ({
                                                       message,
                                                       bottomOffset,
                                                       autoHideMs = 5000,
                                                       onHidden,
                                                       containerStyle,
                                                     }) => {
  const isKeyboardVisible = useKeyboardVisible();
  const theme = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Construit les couleurs une fois (évite de recréer des strings)
  const colors = useMemo(
    () => ({
      bg: withAlpha(theme.error, 0.22),
      border: theme.error,
      icon: theme.error,
      text: theme.error,
    }),
    [theme.error]
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (message) {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();

      if (autoHideMs > 0) {
        timer = setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start(({finished}) => {
            if (finished && onHidden) onHidden();
          });
        }, autoHideMs);
      }
    } else {
      // Si plus de message, on s’assure que le toast est caché
      Animated.timing(opacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message, autoHideMs, onHidden, opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          bottom: bottomOffset || (isKeyboardVisible ? BOTTOM_TABBAR_HEIGHT + 8 : insets.bottom + BOTTOM_TABBAR_HEIGHT + 8),
          opacity,
          transform: [
            {
              translateY: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
        containerStyle,
      ]}
    >
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.icon}/>
      <Text style={[styles.text, {color: colors.text}]}>{message}</Text>
    </Animated.View>
  );
};

export default ApiErrorToast;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
    zIndex: 20,
  },
  text: {flex: 1, fontSize: 14, fontWeight: "600"},
});
