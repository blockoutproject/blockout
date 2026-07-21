import React, {useState} from "react";
import {Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, ViewStyle,} from "react-native";
import {Image} from "expo-image";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedRef,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import {OnboardingStep} from "@/src/components/onboarding/steps";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import GradientButton from "@/src/shared/ui/GradientButton";
import {runOnJS, scheduleOnRN} from "react-native-worklets";

type Props = {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip?: () => void;
  style?: ViewStyle;
  primaryText?: string;
  nextText?: string;
  backText?: string;
  skipText?: string;
  onStepNext?: (step: OnboardingStep) => Promise<void> | void;
};

export function FancyOnboarding({
                                  steps,
                                  onComplete,
                                  onSkip,
                                  style,
                                  primaryText = "C’est parti !",
                                  nextText = "Suivant",
                                  backText = "Précédent",
                                  skipText = "Passer",
                                  onStepNext,
                                }: Props) {
  const insets = useSafeAreaInsets();
  const {width: screenWidth} = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  const svX = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      svX.value = e.contentOffset.x;
    },
  });

  const dragX = useSharedValue(0);
  const jsGoTo = (i: number) => goTo(i);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      dragX.value = event.translationX;
    })
    .onEnd((event) => {
      "worklet";

      const shouldNavigate =
        Math.abs(event.translationX) > screenWidth * 0.25 || Math.abs(event.velocityX) > 600;

      if (shouldNavigate) {
        if (event.translationX < 0 && !isLast) {
          scheduleOnRN(() => jsGoTo(index + 1));
        } else if (event.translationX > 0 && !isFirst) {
          scheduleOnRN(() => jsGoTo(index - 1));
        }
      }
    })
    .onFinalize(() => {
      dragX.value = withSpring(0);
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{translateX: dragX.value * 0.08}],
  }));

  const bgStyle = useAnimatedStyle(() => {
    const colors = steps.map((s) => s.bg);
    const input = steps.map((_, i) => i * screenWidth);
    return {
      backgroundColor: interpolateColor(svX.value, input, colors),
    };
  });

  useAnimatedReaction(
    () => Math.round(svX.value / screenWidth),
    (next, previous) => {
      if (next !== previous) {
      runOnJS(setIndex)(next);
      }
    },
    [screenWidth],
  );

  const goTo = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    });
    scrollRef.current?.scrollTo({x: i * screenWidth, animated: true});
  };

  const onNext = async () => {
    const current = steps[index];

    if (current?.id === "push" && onStepNext) {
      try {
        await onStepNext(current);
      } catch {
        // Push permission failures must not block onboarding navigation.
      }
    }

    if (isLast) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {
      });
      onComplete();
    } else {
      goTo(index + 1);
    }
  };

  const onBack = () => !isFirst && goTo(index - 1);
  const onSkipPress = () => {
    Haptics.selectionAsync().catch(() => {
    });
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  return (
    <Animated.View style={[styles.root, bgStyle, style]}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.flex, dragStyle]}>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{alignItems: "stretch"}}
          >
            {steps.map((step, i) => (
              <Slide key={step.id} step={step} i={i} svX={svX} screenWidth={screenWidth}/>
            ))}
          </Animated.ScrollView>
        </Animated.View>
      </GestureDetector>

      {/* Dots + Skip */}
      <View style={styles.topBar}>
        <Dots steps={steps} svX={svX} screenWidth={screenWidth}/>
        {!isLast && (
          <Pressable onPress={onSkipPress} hitSlop={8} style={styles.skipBtn}>
            <Text style={styles.skipTxt}>{skipText}</Text>
          </Pressable>
        )}
      </View>

      {/* Controls */}
      <View style={[
        styles.controls,
        {paddingBottom: insets.bottom}
      ]}>
        {!isFirst ? (
          <GhostButton label={backText} onPress={onBack}/>
        ) : (
          <View style={{flex: 1}}/>
        )}
        <GradientButton
          label={isLast ? primaryText : nextText}
          onPress={onNext}
          fullWidth={isFirst}
        />
      </View>
    </Animated.View>
  );
}

const IMAGE_SIZE = 200;

const Slide = ({
                 step,
                 i,
                 svX,
                 screenWidth,
               }: {
  step: OnboardingStep;
  i: number;
  svX: SharedValue<number>;
  screenWidth: number;
}) => {
  const base = i * screenWidth;

  const imgParallax = useAnimatedStyle(() => {
    const progress = (svX.value - base) / screenWidth;
    const translateX = interpolate(progress, [-1, 0, 1], [-40, 0, 40], Extrapolation.CLAMP);
    const scale = interpolate(progress, [-1, 0, 1], [0.92, 1, 0.92], Extrapolation.CLAMP);
    const opacity = interpolate(progress, [-0.8, 0, 0.8], [0.2, 1, 0.2], Extrapolation.CLAMP);
    return {transform: [{translateX}, {scale}], opacity};
  });

  const titleStyle = useAnimatedStyle(() => {
    const progress = (svX.value - base) / screenWidth;
    const translateY = interpolate(progress, [-1, 0, 1], [20, 0, -20], Extrapolation.CLAMP);
    const opacity = interpolate(progress, [-0.6, 0, 0.6], [0, 1, 0], Extrapolation.CLAMP);
    return {transform: [{translateY}], opacity};
  });

  const descStyle = useAnimatedStyle(() => {
    const progress = (svX.value - base) / screenWidth;
    const translateY = interpolate(progress, [-1, 0, 1], [10, 0, -10], Extrapolation.CLAMP);
    const opacity = interpolate(progress, [-0.5, 0, 0.5], [0, 1, 0], Extrapolation.CLAMP);
    return {transform: [{translateY}], opacity};
  });

  const visualSource = step.visual.gif ?? step.visual.image;

  return (
    <View style={[styles.slide, {width: screenWidth}]}>
      <Animated.View style={[styles.visual, imgParallax]}>
        {step.visual.component ? (
          <View>{step.visual.component}</View>
        ) : visualSource ? (
          <Image
            source={visualSource}
            style={{width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 24}}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={{width: IMAGE_SIZE, height: IMAGE_SIZE}}/>
        )}
      </Animated.View>

      <Animated.Text style={[styles.title, titleStyle]}>
        {step.title}
      </Animated.Text>
      <Animated.Text style={[styles.desc, descStyle]}>
        {step.description}
      </Animated.Text>
    </View>
  );
};

const Dots = ({
                steps,
                svX,
                screenWidth,
              }: {
  steps: OnboardingStep[];
  svX: SharedValue<number>;
  screenWidth: number;
}) => {
  const input = steps.map((_, index) => index * screenWidth);

  return (
    <View style={styles.dotsRow}>
      {steps.map((step, index) => (
        <Dot key={step.id} index={index} input={input} svX={svX}/>
      ))}
    </View>
  );
};

const Dot = ({
               index,
               input,
               svX,
             }: {
  index: number;
  input: number[];
  svX: SharedValue<number>;
}) => {
  const dotStyle = useAnimatedStyle(() => ({
    width: interpolate(
      svX.value,
      input,
      input.map((_, position) => (position === index ? 22 : 8)),
    ),
    opacity: interpolate(
      svX.value,
      input,
      input.map((_, position) => (position === index ? 1 : 0.35)),
    ),
  }));

  return <Animated.View style={[styles.dot, dotStyle]}/>;
};

const GhostButton = ({
                       label,
                       onPress,
                     }: {
  label: string;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));
  return (
    <Animated.View style={[{flex: 1}, s]}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.98))}
        onPressOut={() => (scale.value = withSpring(1))}
        onPress={onPress}
        style={styles.ghostBtn}
      >
        <Text style={styles.ghostTxt}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  flex: {flex: 1},
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  visual: {
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  desc: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 360,
    marginBottom: 28,
  },

  topBar: {
    position: "absolute",
    top: Platform.select({ios: 54, android: 34, default: 24}),
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: {
    position: "absolute",
    right: 16,
    padding: 8,
  },
  skipTxt: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  dotsRow: {
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
  },

  controls: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wowBtn: {
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    // gradient simple “flat” sans lib: on reste neutre; plug ton <GradientButton/> si tu veux
    backgroundColor: "#7dd3fc",
  },
  wowTxt: {
    fontSize: 15,
    fontWeight: "900",
    color: "#000",
  },
  btnFull: {flex: 1},

  ghostBtn: {
    height: 54,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ghostTxt: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },

  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    marginTop: 4,
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 6,
  },
  cardDesc: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  pillTxt: {
    color: "#fff",
    fontWeight: "700",
  },
});
