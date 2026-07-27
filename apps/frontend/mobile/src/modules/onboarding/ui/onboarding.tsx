import React, { useState } from "react";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { runOnJS } from "react-native-worklets";

import type { OnboardingStep } from "@/src/modules/onboarding/view-models/steps";
import { Action } from "@/src/shared/ui/action";
import {
  borderWidth,
  colors,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";

export type OnboardingProps = {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip?: () => void;
  style?: StyleProp<ViewStyle>;
  primaryText?: string;
  nextText?: string;
  backText?: string;
  skipText?: string;
  onStepNext?: (step: OnboardingStep) => Promise<void> | void;
};

/**
 * Renders the native onboarding pager while preserving swipe, notification, and completion behavior.
 */
export function Onboarding({
  steps,
  onComplete,
  onSkip,
  style,
  primaryText = "C’est parti !",
  nextText = "Suivant",
  backText = "Précédent",
  skipText = "Passer",
  onStepNext,
}: OnboardingProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const offset = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      offset.value = event.contentOffset.x;
    },
  });

  useAnimatedReaction(
    () => Math.round(offset.value / screenWidth),
    (next, previous) => {
      if (next !== previous) {
        runOnJS(setIndex)(next);
      }
    },
    [screenWidth],
  );

  const backgroundStyle = useAnimatedStyle(() => {
    const input = steps.map((_, stepIndex) => stepIndex * screenWidth);
    const backgroundColors = steps.map((step) => step.backgroundColor);

    return {
      backgroundColor: interpolateColor(offset.value, input, backgroundColors),
    };
  });

  const goTo = (nextIndex: number) => {
    scrollRef.current?.scrollTo({
      x: nextIndex * screenWidth,
      animated: true,
    });
  };

  const handleNext = async () => {
    const current = steps[index];

    if (current?.id === "push" && onStepNext) {
      try {
        await onStepNext(current);
      } catch {
        // Push permission failures must not block onboarding navigation.
      }
    }

    if (isLast) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
      onComplete();
      return;
    }

    goTo(index + 1);
  };

  const handleBack = () => {
    if (isFirst) {
      return;
    }
    Haptics.selectionAsync().catch(() => undefined);
    goTo(index - 1);
  };

  const handleSkip = () => {
    Haptics.selectionAsync().catch(() => undefined);
    (onSkip ?? onComplete)();
  };

  return (
    <Animated.View
      style={[styles.root, backgroundStyle, style]}
      testID="onboarding-screen"
    >
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {steps.map((step, stepIndex) => (
          <OnboardingSlide
            key={step.id}
            step={step}
            index={stepIndex}
            offset={offset}
            screenWidth={screenWidth}
          />
        ))}
      </Animated.ScrollView>

      <View style={[styles.topBar, { top: insets.top + spacing[2] }]}>
        <OnboardingDots
          steps={steps}
          offset={offset}
          screenWidth={screenWidth}
        />
        {!isLast ? (
          <Pressable
            onPress={handleSkip}
            style={styles.skipAction}
            accessibilityRole="button"
            accessibilityLabel={skipText}
            testID="onboarding-skip-action"
          >
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>
              {skipText}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={[styles.controls, { paddingBottom: insets.bottom + spacing[3] }]}
      >
        {!isFirst ? (
          <OnboardingBackAction label={backText} onPress={handleBack} />
        ) : (
          <View style={styles.controlSpacer} />
        )}
        <Action
          label={isLast ? primaryText : nextText}
          onPress={handleNext}
          fullWidth={isFirst}
          testID="onboarding-primary-action"
        />
      </View>
    </Animated.View>
  );
}

const IMAGE_SIZE = 200;

type OnboardingSlideProps = {
  step: OnboardingStep;
  index: number;
  offset: SharedValue<number>;
  screenWidth: number;
};

/** Renders one pager step and its source-backed transition. */
function OnboardingSlide({
  step,
  index,
  offset,
  screenWidth,
}: OnboardingSlideProps) {
  const theme = useAppTheme();
  const base = index * screenWidth;
  const visualSource = step.visual.gif ?? step.visual.image;

  const visualStyle = useAnimatedStyle(() => {
    const progress = (offset.value - base) / screenWidth;
    const translateX = interpolate(
      progress,
      [-1, 0, 1],
      [-40, 0, 40],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      progress,
      [-1, 0, 1],
      [0.92, 1, 0.92],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      progress,
      [-0.8, 0, 0.8],
      [0.2, 1, 0.2],
      Extrapolation.CLAMP,
    );

    return { transform: [{ translateX }, { scale }], opacity };
  });

  const titleStyle = useAnimatedStyle(() => {
    const progress = (offset.value - base) / screenWidth;
    return {
      transform: [
        {
          translateY: interpolate(
            progress,
            [-1, 0, 1],
            [20, 0, -20],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        progress,
        [-0.6, 0, 0.6],
        [0, 1, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  const descriptionStyle = useAnimatedStyle(() => {
    const progress = (offset.value - base) / screenWidth;
    return {
      transform: [
        {
          translateY: interpolate(
            progress,
            [-1, 0, 1],
            [10, 0, -10],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        progress,
        [-0.5, 0, 0.5],
        [0, 1, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <View style={[styles.slide, { width: screenWidth }]}>
      <Animated.View style={[styles.visual, visualStyle]}>
        {step.visual.component ? (
          <View>{step.visual.component}</View>
        ) : visualSource ? (
          <Image
            source={visualSource}
            style={styles.image}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.image} />
        )}
      </Animated.View>

      <Animated.Text
        style={[styles.title, { color: theme.text }, titleStyle]}
        accessibilityRole="header"
      >
        {step.title}
      </Animated.Text>
      <Animated.Text
        style={[
          styles.description,
          { color: theme.textSecondary },
          descriptionStyle,
        ]}
      >
        {step.description}
      </Animated.Text>
    </View>
  );
}

type OnboardingDotsProps = {
  steps: OnboardingStep[];
  offset: SharedValue<number>;
  screenWidth: number;
};

/** Indicates the current onboarding step without duplicating pager state. */
function OnboardingDots({ steps, offset, screenWidth }: OnboardingDotsProps) {
  const input = steps.map((_, index) => index * screenWidth);

  return (
    <View style={styles.dotsRow} accessibilityElementsHidden>
      {steps.map((step, index) => (
        <OnboardingDot
          key={step.id}
          index={index}
          input={input}
          offset={offset}
        />
      ))}
    </View>
  );
}

type OnboardingDotProps = {
  index: number;
  input: number[];
  offset: SharedValue<number>;
};

/** Renders one animated pager indicator. */
function OnboardingDot({ index, input, offset }: OnboardingDotProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(
      offset.value,
      input,
      input.map((_, position) => (position === index ? 22 : 8)),
    ),
    opacity: interpolate(
      offset.value,
      input,
      input.map((_, position) => (position === index ? 1 : 0.35)),
    ),
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

type OnboardingBackActionProps = {
  label: string;
  onPress: () => void;
};

/** Renders the secondary onboarding navigation action. */
function OnboardingBackAction({ label, onPress }: OnboardingBackActionProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.backAction,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="onboarding-back-action"
    >
      <Text style={[styles.backActionText, { color: theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "stretch",
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[10],
    alignItems: "center",
    justifyContent: "center",
  },
  visual: {
    marginBottom: spacing[10],
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: radius.xl,
    borderCurve: "continuous",
  },
  title: {
    ...typography.heading,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  description: {
    ...typography.bodyStrong,
    textAlign: "center",
    maxWidth: 360,
    marginBottom: spacing[6],
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  skipAction: {
    position: "absolute",
    right: spacing[4],
    minHeight: 44,
    paddingHorizontal: spacing[2],
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: typography.compactStrong,
  dotsRow: {
    height: 26,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.surface.secondary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.icon.primary,
  },
  controls: {
    paddingHorizontal: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  controlSpacer: {
    flex: 1,
  },
  backAction: {
    flex: 1,
    height: 54,
    borderRadius: radius.full,
    borderCurve: "continuous",
    borderWidth: borderWidth.thin,
    alignItems: "center",
    justifyContent: "center",
  },
  backActionText: typography.compactStrong,
});
