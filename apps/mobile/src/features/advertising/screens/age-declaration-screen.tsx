import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "../../../shared/components/brand-mark";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { DiscoveryBackdrop } from "../../onboarding/components/discovery-artwork";
import { AgeForm } from "../components/age-form";
import { useAgeDeclaration } from "../age-declaration-provider";

/** Reuses F14 artwork with slow native motion; reduced motion remains static, including live changes. */
function AgeBackdrop() {
  const [reducedMotion, setReducedMotion] = useState(true);
  const offset = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));
  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    offset.set(0);
    if (reducedMotion) return;
    offset.set(
      withRepeat(
        withTiming(-48, {
          duration: 24000,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        true,
        undefined,
        ReduceMotion.System,
      ),
    );
    return () => cancelAnimation(offset);
  }, [offset, reducedMotion]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, animatedStyle]}
    >
      <DiscoveryBackdrop />
    </Animated.View>
  );
}

/** Mandatory initial/renewal surface; the router guards home and owns completion navigation. */
export function AgeDeclarationScreen() {
  const { colors } = useTheme();
  const age = useAgeDeclaration();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={styles.header}>
        <View style={styles.brand} accessible accessibilityLabel="Blockout">
          <BrandMark />
          <Text style={[tokens.typography.navigation, { color: colors.text }]}>
            BLOCKOUT
          </Text>
        </View>
        <View
          accessible={false}
          pointerEvents="none"
          style={[styles.divider, { backgroundColor: colors.border }]}
        />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.stage}>
        <AgeBackdrop />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, outlineColor: colors.border },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[tokens.typography.headingXl, { color: colors.text }]}
          >
            {age.renewal
              ? "Quel âge avez-vous aujourd’hui ?"
              : "Quel est votre âge ?"}
          </Text>
          {age.loading ? (
            <RequestLoading />
          ) : age.readFailed ? (
            <RequestError
              message="Votre déclaration n’a pas pu être chargée."
              onRetry={age.retryRead}
            />
          ) : (
            <AgeForm onSubmit={age.confirm} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: tokens.spacing.section },
  header: {
    minHeight: 69,
    paddingBottom: tokens.spacing.lg,
    justifyContent: "center",
  },
  divider: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: tokens.borderWidth,
  },
  brand: { flexDirection: "row", gap: 9, alignItems: "center" },
  scroll: { flex: 1, marginHorizontal: -tokens.spacing.section },
  stage: {
    flexGrow: 1,
    justifyContent: "center",
    padding: tokens.spacing.section,
  },
  card: {
    padding: tokens.spacing.lg,
    // Figma Surface excludes its inside stroke from content layout; native outlines do the same.
    outlineWidth: tokens.borderWidth,
    outlineOffset: -tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    gap: tokens.spacing.sm,
  },
});
