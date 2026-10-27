import { Page, PageScrollView } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { BrandHeader } from "../../../shared/components/brand-header";
import { Surface } from "../../../shared/components/surface";
import { ScreenState } from "../../../shared/components/screen-state";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useReducedMotion } from "../../../shared/theme/use-reduced-motion";
import { DiscoveryBackdrop } from "../../onboarding/components/discovery-artwork";
import { AgeForm } from "../forms/age-form";
import { useAgeDeclaration } from "../age-declaration-provider";

/** Reuses F14 artwork with slow native motion; reduced motion remains static, including live changes. */
function AgeBackdrop() {
  const reducedMotion = useReducedMotion();
  const offset = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));
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
  return <DiscoveryBackdrop artworkStyle={animatedStyle} />;
}

/**
 * Mandatory initial/renewal form; the router guards home and owns completion navigation.
 * Initial storage feedback shares the useful-area placement; only the ready form owns artwork.
 */
export function AgeDeclarationScreen() {
  const { colors } = useTheme();
  const age = useAgeDeclaration();
  return (
    <Page>
      <BrandHeader />
      <PageScrollView>
        {age.loading || age.readFailed ? (
          <ScreenState>
            {age.loading ? (
              <RequestLoading />
            ) : (
              <ErrorState onRetry={age.retryRead} />
            )}
          </ScreenState>
        ) : (
          <View style={styles.stage}>
            <AgeBackdrop />
            <Surface>
              <View style={styles.form}>
                <Text
                  accessibilityRole="header"
                  style={[tokens.typography.headingXl, { color: colors.text }]}
                >
                  {age.renewal
                    ? "Quel âge avez-vous aujourd’hui ?"
                    : "Quel est votre âge ?"}
                </Text>
                <AgeForm pending={age.pending} onSubmit={age.confirm} />
              </View>
            </Surface>
          </View>
        )}
      </PageScrollView>
    </Page>
  );
}
const styles = StyleSheet.create({
  // Entry artwork shares discovery's centered stage and wider illustrative inset.
  stage: {
    flexGrow: 1,
    justifyContent: "center",
    padding: tokens.spacing["2xl"],
  },
  form: { gap: tokens.layout.form.gap },
});
