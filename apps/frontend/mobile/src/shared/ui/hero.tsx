import React from "react";
import {
  StyleSheet,
  StyleSheet as RNStyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  fontWeight,
  iconSize,
  letterSpacing,
  radius,
  spacing,
  typography,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import { Pill } from "@/src/shared/ui/pill";
import { IconAction } from "@/src/shared/ui/icon-action";

export type HeroProps = {
  variant: "title" | "titleAndMeta";
  title: string;
  subtitle?: string;
  subtitleIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];

  avatarUri?: string | null;
  avatarFallback: ImageSource;

  backgroundUri?: string | null;
  backgroundFallback?: ImageSource;

  onEdit?: () => void;
  testID?: string;
  editTestID?: string;

  topAccessory?: React.ReactNode;
};

const DEFAULTS = {
  blurRadius: 60,
  EDGE: 0.95,
  MID: 0.0,
};

const variants = {
  title: {
    avatarSize: 90,
    avatarRadius: 24,
  },
  titleAndMeta: {
    avatarSize: 120,
    avatarRadius: 60,
  },
} as const;

const Hero: React.FC<HeroProps> = ({
  variant,
  title,
  subtitle,
  subtitleIcon,

  avatarUri,
  avatarFallback,

  backgroundUri,
  backgroundFallback,

  onEdit,
  testID = "entity-hero",
  editTestID = "entity-hero-edit",

  topAccessory,
}) => {
  const theme = useAppTheme();
  const isTitleOnly = variant === "title";
  const geometry = variants[variant];

  const bgSource =
    (backgroundUri ? { uri: backgroundUri } : undefined) ??
    (avatarUri ? { uri: avatarUri } : undefined) ??
    backgroundFallback ??
    avatarFallback;

  return (
    <View style={styles.wrapper} testID={testID}>
      <Image
        source={bgSource}
        style={RNStyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={DEFAULTS.blurRadius}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha(theme.backgroundSecondary, DEFAULTS.EDGE),
          withAlpha(theme.backgroundSecondary, DEFAULTS.MID),
          withAlpha(theme.backgroundSecondary, DEFAULTS.EDGE),
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={RNStyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha(theme.backgroundSecondary, DEFAULTS.EDGE),
          withAlpha(theme.backgroundSecondary, DEFAULTS.MID),
          withAlpha(theme.backgroundSecondary, DEFAULTS.EDGE),
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={RNStyleSheet.absoluteFill}
      />

      {topAccessory ? (
        <View style={styles.topAccessory}>{topAccessory}</View>
      ) : null}

      {onEdit ? (
        <View style={styles.fab}>
          <IconAction
            onPress={onEdit}
            accessibilityLabel={`Modifier ${title}`}
            treatment="surface"
            testID={editTestID}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={iconSize.lg}
              color={theme.text}
            />
          </IconAction>
        </View>
      ) : null}

      <View
        style={[
          styles.content,
          isTitleOnly ? styles.titleOnlyContent : styles.contentWithMeta,
        ]}
      >
        <MaskedImage
          uri={avatarUri || undefined}
          size={geometry.avatarSize}
          radius={geometry.avatarRadius}
          shadow
        />

        <Text
          style={[
            styles.title,
            isTitleOnly ? styles.titleOnlyTitle : undefined,
            { color: theme.text },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>

        {!!subtitle && (
          <View style={styles.metaRow}>
            <Pill
              label={subtitle}
              leftIcon={subtitleIcon}
              size="lg"
              borderWidth={1}
              backgroundColor={withAlpha(theme.surface, 0.9)}
              borderColor={withAlpha(theme.text, 0.16)}
              textColor={theme.text}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export default Hero;

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    position: "relative",
    borderRadius: radius.hero,
    borderCurve: "continuous",
  },
  topAccessory: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 6,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: spacing[3],
  },
  contentWithMeta: {
    gap: spacing[2],
    paddingVertical: spacing.roomy,
  },
  titleOnlyContent: {
    gap: spacing.tight,
    paddingTop: 18,
    paddingBottom: 16,
  },
  title: {
    textAlign: "center",
    fontSize: typography.heading.fontSize,
    fontWeight: fontWeight.extraBold,
    letterSpacing: letterSpacing.metadata,
    paddingHorizontal: spacing[6],
  },
  titleOnlyTitle: {
    fontWeight: fontWeight.bold,
    lineHeight: typography.heading.lineHeight,
    letterSpacing: letterSpacing.reset,
  },
  metaRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.tight,
    paddingHorizontal: spacing[2],
  },
  fab: {
    position: "absolute",
    top: spacing[3],
    right: spacing[3],
    zIndex: 5,
  },
});
