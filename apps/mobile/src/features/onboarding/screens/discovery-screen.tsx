import {
  AccessFrame,
  AccessStageCard,
  AccessStageScrollView,
} from "@/shared/components/access-frame";
import { AccessCelebration } from "@/shared/components/access-celebration";
import { Button } from "@/shared/components/button";
import { controlOpacity } from "@/shared/components/control-styles";
import { IconButton } from "@/shared/components/icon-button";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  Flag,
  LogIn,
  type LucideIcon,
} from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type Ref,
} from "react";
import {
  AccessibilityInfo,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useDiscovery } from "../discovery-provider";

interface DiscoveryStep {
  title: string;
  description: string;
  note?: string;
  icon?: LucideIcon;
}

const steps: readonly DiscoveryStep[] = [
  {
    icon: CalendarDays,
    title: "Trouve ton prochain match",
    description:
      "Calendriers, résultats et classements des compétitions couvertes, du départemental au national.",
  },
  {
    icon: Bell,
    title: "Ne rate pas le résultat",
    description:
      "Suis tes équipes et tes poules. Retrouve leurs résultats et liens de diffusion disponibles dans Notifications.",
    note: "Les alertes sur ton téléphone sont facultatives.",
  },
  {
    icon: Flag,
    title: "Une info à vérifier ?",
    description:
      "Blockout est indépendante et s’appuie sur les sources officielles FFVB et LNV selon la compétition.",
    note: "Un souci ? Signale-le depuis la fiche du match.",
  },
  {
    icon: LogIn,
    title: "Déjà sur Blockout ?",
    description:
      "Reconnecte-toi avec ton compte habituel. Tes anciens suivis, notifications, contributions et personnalisations de profil ne sont pas transférés.",
    note: "Tes droits Pro sont conservés. Si besoin, choisis « Restaurer mes achats » dans l’espace Pro après connexion.",
  },
  {
    title: "À toi de jouer",
    description:
      "Explore les matchs sans compte. Connecte-toi pour suivre tes équipes et tes poules.",
  },
];
const finalStep = steps.length - 1;

function DiscoveryPane({
  content,
  index,
  step,
  position,
  width,
  scroll,
  heading,
}: Readonly<{
  content: DiscoveryStep;
  index: number;
  step: number;
  position: SharedValue<number>;
  width: number;
  scroll: Ref<ScrollViewInstance>;
  heading: Ref<ComponentRef<typeof Text>>;
}>) {
  const { colors, reducedMotion } = useTheme();
  const Icon = content.icon;
  const active = index === step;
  const showCelebration = index === finalStep;
  // Each settled card has a native origin inside the viewport, so Android exposes its text.
  const paneStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (index - (reducedMotion ? step : position.get())) * width },
    ],
  }));
  return (
    <Animated.View
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      pointerEvents={active ? "auto" : "none"}
      style={[StyleSheet.absoluteFill, paneStyle]}
    >
      <AccessStageScrollView ref={active ? scroll : undefined}>
        <AccessStageCard style={showCelebration && styles.celebrationCard}>
          {showCelebration && <AccessCelebration animated={active} />}
          {Icon && (
            <View style={[styles.glyph, { backgroundColor: colors.subtle }]}>
              <Icon
                accessible={false}
                size={tokens.size.icon.lg}
                color={colors.icon}
              />
            </View>
          )}
          <Text
            ref={active ? heading : undefined}
            accessible
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            {content.title}
          </Text>
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            {content.description}
          </Text>
          {content.note && (
            <View style={[styles.note, { backgroundColor: colors.subtle }]}>
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                {content.note}
              </Text>
            </View>
          )}
        </AccessStageCard>
      </AccessStageScrollView>
    </Animated.View>
  );
}

/** Common discovery releases this session on explicit finish/skip, independently of flag persistence. */
export function DiscoveryScreen() {
  const { colors, reducedMotion } = useTheme();
  const discovery = useDiscovery();
  const [step, setStep] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const [viewportWidth, setViewportWidth] = useState(0);
  const width = viewportWidth || windowWidth;
  const position = useSharedValue(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const heading = useRef<ComponentRef<typeof Text>>(null);
  const focusHeading = useCallback(() => {
    if (heading.current) {
      AccessibilityInfo.sendAccessibilityEvent(heading.current, "focus");
    }
  }, []);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (reducedMotion) {
      position.set(step);
      focusHeading();
      return;
    }

    // Focus the new heading after the card reaches the viewport.
    position.set(
      withTiming(
        step,
        {
          duration: 440,
          easing: Easing.bezier(0.22, 0.75, 0.22, 1),
          reduceMotion: ReduceMotion.Never,
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(focusHeading);
          }
        },
      ),
    );
    return () => cancelAnimation(position);
  }, [focusHeading, position, reducedMotion, step]);

  const previous = useCallback(
    () => setStep((value) => Math.max(0, value - 1)),
    [],
  );
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (step === 0) {
          return false;
        }
        previous();
        return true;
      },
    );
    return () => subscription.remove();
  }, [previous, step]);

  return (
    <AccessFrame
      headerAction={
        step !== finalStep && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Passer"
            onPress={discovery.finish}
            style={({ pressed }) => [
              styles.skip,
              { opacity: controlOpacity(false, pressed) },
            ]}
          >
            <Text style={[tokens.typography.strong, { color: colors.text }]}>
              Passer
            </Text>
          </Pressable>
        )
      }
      footer={
        <View style={styles.footer}>
          <View
            style={[
              styles.previous,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <IconButton
              label="Étape précédente"
              onPress={previous}
              disabled={step === 0}
            >
              <ChevronLeft size={tokens.size.icon.lg} color={colors.icon} />
            </IconButton>
          </View>
          <View
            accessible
            accessibilityLabel={`Étape ${step + 1} sur ${steps.length}`}
            style={styles.progress}
          >
            {steps.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.dot,
                  {
                    width: index === step ? 19 : 5,
                    backgroundColor:
                      index === step ? colors.text : colors.secondaryText,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.trailingAction}>
            <Button
              rounded
              label={step === finalStep ? "Commencer" : "Suivant"}
              trailingIcon={ArrowRight}
              onPress={
                step === finalStep
                  ? discovery.finish
                  : () => setStep((value) => Math.min(finalStep, value + 1))
              }
            />
          </View>
        </View>
      }
    >
      <View
        onLayout={({ nativeEvent: { layout } }) =>
          setViewportWidth(layout.width)
        }
        style={styles.viewport}
      >
        {steps.map((content, index) => (
          <DiscoveryPane
            key={content.title}
            content={content}
            index={index}
            step={step}
            position={position}
            width={width}
            scroll={scroll}
            heading={heading}
          />
        ))}
      </View>
    </AccessFrame>
  );
}

const styles = StyleSheet.create({
  celebrationCard: { gap: tokens.spacing.sm },
  title: tokens.typography.headingXl,
  glyph: {
    width: tokens.size.control.default,
    height: tokens.size.control.default,
    borderRadius: tokens.radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  note: {
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.compact,
  },
  skip: {
    minHeight: tokens.touch.minimum,
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.md,
  },
  viewport: { flex: 1, overflow: "hidden" },
  footer: {
    paddingHorizontal: tokens.spacing["2xl"],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.md,
    alignItems: "center",
    paddingVertical: tokens.spacing.lg,
  },
  previous: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.full,
  },
  progress: {
    flexGrow: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: tokens.spacing.tight,
  },
  dot: { height: 5, borderRadius: tokens.radius.full },
  trailingAction: { marginLeft: "auto", maxWidth: "100%" },
});
