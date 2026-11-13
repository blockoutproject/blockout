import { Page, PageContent, PageScrollView } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";
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

import { BrandHeader } from "@/shared/components/brand-header";
import { Surface } from "@/shared/components/surface";
import { ScreenState } from "@/shared/components/screen-state";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useReducedMotion } from "@/shared/theme/use-reduced-motion";
import { DiscoveryBackdrop } from "@/features/onboarding/components/discovery-artwork";
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
    if (reducedMotion) {
      return;
    }
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
 * Initial storage loading reserves the known declaration in page flow; only the ready form owns artwork.
 */
export function AgeDeclarationScreen() {
  const { colors } = useTheme();
  const age = useAgeDeclaration();

  /** Waits for installation storage before mounting the ready declaration form. */
  function renderContent() {
    if (age.readFailed) {
      return (
        <ScreenState>
          <ErrorState
            onRetry={() => void age.retryRead()}
            retrying={age.loading}
          />
        </ScreenState>
      );
    }
    if (age.loading) {
      return (
        <PageContent>
          <AgeLoading />
        </PageContent>
      );
    }
    return (
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
    );
  }

  return (
    <Page header={<BrandHeader />}>
      <PageScrollView>{renderContent()}</PageScrollView>
    </Page>
  );
}

/** Reserves the declaration's numeric choice, adjustment rail and action without selecting a default age. */
function AgeLoading() {
  return (
    <Surface>
      <LoadingGroup
        label="Chargement de la déclaration d’âge"
        style={styles.form}
      >
        <Skeleton width="80%" height={tokens.typography.headingXl.lineHeight} />
        <Skeleton width="65%" />
        <View style={styles.value}>
          <Skeleton
            width={72}
            height={tokens.typography.displayAge.lineHeight}
          />
        </View>
        <View style={styles.adjust}>
          <Skeleton
            width={tokens.touch.minimum}
            height={tokens.touch.minimum}
            shape="rectangle"
          />
          <View style={styles.rail}>
            <Skeleton height={tokens.spacing.sm} />
          </View>
          <Skeleton
            width={tokens.touch.minimum}
            height={tokens.touch.minimum}
            shape="rectangle"
          />
        </View>
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </LoadingGroup>
    </Surface>
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
  value: { alignItems: "center" },
  adjust: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  rail: { flex: 1 },
});
