import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { tokens } from "../../../shared/theme/tokens";
import { useReducedMotion } from "../../../shared/theme/use-reduced-motion";

/** A decorative single-line label; the enclosing pool link retains the complete accessible name. */
export interface ScrollingParticipationLabelProps {
  label: string;
  color: string;
  active: boolean;
}

/** Pans overflow only in the focused active scene; blur, reduced motion and unmount cancel/reset it. */
export function ScrollingParticipationLabel({
  label,
  color,
  active,
}: ScrollingParticipationLabelProps) {
  const reducedMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  const offset = useSharedValue(0);
  const travel = Math.max(0, content - viewport);
  useFocusEffect(
    useCallback(() => {
      offset.set(0);
      if (active && !reducedMotion && viewport > 0 && travel > 0) {
        // DiscoveryBadges in the approved prototype uses this duration and 18/37/27/18 percent cycle.
        const duration = Math.max(6000, 4000 + (travel / 24) * 1000);
        offset.set(
          withRepeat(
            withSequence(
              withDelay(
                duration * 0.18,
                withTiming(-travel, {
                  duration: duration * 0.37,
                  easing: Easing.inOut(Easing.ease),
                }),
              ),
              withDelay(
                duration * 0.27,
                withTiming(0, {
                  duration: duration * 0.18,
                  easing: Easing.inOut(Easing.ease),
                }),
              ),
            ),
            -1,
          ),
        );
      }
      return () => {
        cancelAnimation(offset);
        offset.set(0);
      };
    }, [active, reducedMotion, viewport, travel, offset]),
  );
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));
  if (reducedMotion) {
    return (
      <Text
        accessible={false}
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.label, { color }]}
      >
        {label}
      </Text>
    );
  }
  return (
    <ScrollView
      horizontal
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
      onContentSizeChange={(width) => setContent(width)}
      style={[
        styles.viewport,
        { height: tokens.typography.metadata.lineHeight * fontScale },
      ]}
    >
      <Animated.Text
        accessible={false}
        numberOfLines={1}
        style={[tokens.typography.metadata, { color }, animated]}
      >
        {label}
      </Animated.Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, minWidth: 0 },
  label: { ...tokens.typography.metadata, flex: 1, minWidth: 0 },
});
