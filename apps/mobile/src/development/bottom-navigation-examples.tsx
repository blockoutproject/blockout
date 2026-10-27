import {
  Bell,
  ChevronLeft,
  House,
  Search,
  UserRound,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "../shared/components/icon-button";
import { useTheme } from "../shared/theme/theme-provider";
import { useReducedMotion } from "../shared/theme/use-reduced-motion";
import { tokens } from "../shared/theme/tokens";

// UI Library Motion / Navigation, 3194:109: one 280 ms transition, interrupted from its current position.
const duration = 280;
const easing = Easing.out(Easing.cubic);

const destinations = [
  { key: "home", title: "Accueil", Icon: House },
  { key: "search", title: "Rechercher", Icon: Search },
  { key: "notifications", title: "Notifications", Icon: Bell },
  { key: "profile", title: "Profil", Icon: UserRound },
] as const;

/** These local destinations exercise presentation without creating routes, providers or a second navigator. */
type Destination = (typeof destinations)[number];
type DestinationKey = Destination["key"];

/** The actual app's existing row and guest shapes are previewed without changing their production owners. */
type Format = "four" | "guest" | "wrapped";

/** The fixture owns selection; this decoration adds no navigator, gestures or delayed route changes. */
interface BarProps {
  items: readonly Destination[];
  selected: DestinationKey;
  reducedMotion: boolean;
  onSelect: (key: DestinationKey) => void;
}

/** Isolated motion trial; the bar stays mounted across fictional destinations and supports live reduced motion. */
export function BottomNavigationExamplesScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<DestinationKey>("home");
  const [format, setFormat] = useState<Format>("four");
  const [forceReducedMotion, setForceReducedMotion] = useState(false);
  const sequenceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => sequenceTimers.current.forEach(clearTimeout), []);
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = forceReducedMotion || systemReducedMotion;
  const { colors } = useTheme();
  const items = destinations.filter(
    (item) =>
      format !== "guest" || item.key === "search" || item.key === "profile",
  );
  const active = items.find((item) => item.key === selected) ?? items[0];
  const Icon = active.Icon;
  /** Cancel only fixture stimuli; Reanimated owns interruption of the actual transition. */
  function stopSequence() {
    sequenceTimers.current.forEach(clearTimeout);
    sequenceTimers.current = [];
  }
  /** A real press takes precedence over any pending automated fixture selections. */
  function select(key: DestinationKey) {
    stopSequence();
    setSelected(key);
  }
  /** Six 80 ms selection changes exercise retargeting before the 280 ms animation can finish. */
  function playSequence() {
    stopSequence();
    sequenceTimers.current = [
      items.length - 1,
      0,
      1,
      0,
      items.length - 1,
      0,
    ].map((index, step) =>
      setTimeout(() => setSelected(items[index].key), 80 * (step + 1)),
    );
  }
  /** A removed guest destination is reconciled in the fixture action, never by a navigation effect. */
  function changeFormat(next: Format) {
    stopSequence();
    setFormat(next);
    if (next === "guest" && selected !== "search" && selected !== "profile")
      setSelected("search");
  }
  const barProps: BarProps = {
    items,
    selected: active.key,
    reducedMotion,
    onSelect: select,
  };
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={styles.heading}>
        <IconButton label="Retour aux essais" onPress={onBack}>
          <ChevronLeft color={colors.icon} size={24} />
        </IconButton>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.heading, { color: colors.text }]}
        >
          Navigation animée
        </Text>
      </View>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
      >
        <View style={styles.controls}>
          <View style={styles.options}>
            {(
              [
                ["four", "4 onglets"],
                ["guest", "2 onglets"],
                ["wrapped", "2 lignes"],
              ] as const
            ).map(([value, label]) => (
              <TrialOption
                key={value}
                label={label}
                selected={format === value}
                onPress={() => changeFormat(value)}
              />
            ))}
          </View>
          <View style={styles.options}>
            <TrialOption
              label="Séquence rapide"
              selected={false}
              onPress={playSequence}
            />
            <TrialOption
              label="Mouvement réduit"
              selected={forceReducedMotion}
              onPress={() => setForceReducedMotion(!forceReducedMotion)}
            />
          </View>
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            {reducedMotion
              ? "Transitions instantanées"
              : "280 ms · glissement et fondu"}
            {systemReducedMotion ? " · préférence système" : ""}
          </Text>
        </View>
        <View style={styles.destination}>
          <Icon accessible={false} size={48} color={colors.icon} />
          <Text
            accessibilityRole="header"
            style={[tokens.typography.headingXl, { color: colors.text }]}
          >
            {active.title}
          </Text>
          <Text style={[styles.description, { color: colors.secondaryText }]}>
            Contenu fictif. La sélection change immédiatement ; l’animation
            accompagne le changement.
          </Text>
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        <TrialBar {...barProps} wrapped={format === "wrapped"} />
      </View>
    </SafeAreaView>
  );
}

/** Native selectable fixture control, distinct from destination tab semantics. */
function TrialOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? colors.inverse : colors.surface,
          borderColor: colors.border,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.optionLabel,
          { color: selected ? colors.onInverse : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** One well follows native button rectangles inside a borderless layout owner; Reanimated owns interrupted transitions. */
function TrialBar({
  items,
  selected,
  wrapped,
  ...props
}: BarProps & { wrapped: boolean }) {
  const { colors, membership } = useTheme();
  const [layouts, setLayouts] = useState<
    Partial<Record<DestinationKey, LayoutRectangle>>
  >({});
  const target = layouts[selected];
  return (
    <View
      style={[
        styles.capsule,
        { backgroundColor: colors.raised, borderColor: membership.border },
      ]}
    >
      <View style={styles.adaptiveRow}>
        {target && (
          <Animated.View
            key={props.reducedMotion ? "static" : "animated"}
            pointerEvents="none"
            layout={
              props.reducedMotion
                ? undefined
                : LinearTransition.duration(duration)
                    .easing(easing)
                    .reduceMotion(ReduceMotion.System)
            }
            style={[
              styles.indicator,
              styles.positionedIndicator,
              {
                backgroundColor: membership.fill,
                left: target.x,
                top: target.y,
                width: target.width,
                height: target.height,
              },
            ]}
          />
        )}
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.title}
            accessibilityState={{ selected: item.key === selected }}
            onPress={() => props.onSelect(item.key)}
            onLayout={({ nativeEvent: { layout } }) =>
              setLayouts((current) => {
                const previous = current[item.key];
                return previous?.x === layout.x &&
                  previous.y === layout.y &&
                  previous.width === layout.width &&
                  previous.height === layout.height
                  ? current
                  : { ...current, [item.key]: layout };
              })
            }
            style={({ pressed }) => [
              styles.item,
              wrapped ? styles.twoColumns : styles.oneRow,
              { opacity: pressed ? tokens.opacity.pressed : 1 },
            ]}
          >
            <AnimatedTabContent
              item={item}
              active={item.key === selected}
              reducedMotion={props.reducedMotion}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** One focus interpolation drives label color, paired native glyph opacity and a subtle one-point icon emphasis. */
function AnimatedTabContent({
  item,
  active,
  reducedMotion,
}: {
  item: Destination;
  active: boolean;
  reducedMotion: boolean;
}) {
  const { colors, membership } = useTheme();
  const focus = useDerivedValue(() =>
    withTiming(active ? 1 : 0, {
      duration: reducedMotion ? 0 : duration,
      easing,
      reduceMotion: ReduceMotion.System,
    }),
  );
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      focus.value,
      [0, 1],
      [colors.text, membership.content],
    ),
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + focus.value * 0.04 },
      { translateY: -focus.value },
    ],
  }));
  const inactiveStyle = useAnimatedStyle(() => ({ opacity: 1 - focus.value }));
  const activeStyle = useAnimatedStyle(() => ({ opacity: focus.value }));
  return (
    <>
      <Animated.View style={[styles.icon, iconStyle]}>
        <Animated.View style={inactiveStyle}>
          <item.Icon accessible={false} size={24} color={colors.icon} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, activeStyle]}>
          <item.Icon accessible={false} size={24} color={membership.content} />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]}>
        {item.title}
      </Animated.Text>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  body: { flex: 1 },
  bodyContent: { flexGrow: 1 },
  controls: { padding: tokens.spacing.lg, gap: tokens.spacing.sm },
  options: { flexDirection: "row", gap: tokens.spacing.sm },
  option: {
    flex: 1,
    minHeight: tokens.touch.minimum,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    padding: tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { ...tokens.typography.label, textAlign: "center" },
  destination: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
  description: {
    ...tokens.typography.body,
    textAlign: "center",
    maxWidth: 300,
  },
  bottom: {
    paddingHorizontal: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
  },
  capsule: {
    borderRadius: tokens.radius.panel,
    borderWidth: tokens.border.thin,
    padding: tokens.spacing.xs,
    overflow: "hidden",
  },
  adaptiveRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
  },
  indicator: { borderRadius: tokens.radius.panelInset },
  positionedIndicator: { position: "absolute" },
  item: {
    minHeight: 56,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.optical,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
  },
  oneRow: { flexGrow: 1, width: 0 },
  twoColumns: { flexGrow: 1, width: "45%" },
  icon: { width: 24, height: 24 },
  label: {
    ...tokens.typography.navigationLabel,
    margin: 0,
    textAlign: "center",
  },
});
