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
import { iconSize, spacing, useAppTheme, withAlpha } from "@/src/shared/theme";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import { Pill } from "@/src/shared/ui/pill";
import { IconAction } from "@/src/shared/ui/icon-action";

export type HeroProps = {
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

  containerRadius?: number;
  avatarSize?: number;
  avatarRadius?: number;
  blurRadius?: number;
  titleLines?: number;

  topLeftNode?: React.ReactNode;
};

const DEFAULTS = {
  containerRadius: 18,
  avatarSize: 100,
  avatarRadius: 24,
  blurRadius: 60,
  titleLines: 2,
  EDGE: 0.95,
  MID: 0.0,
};

const Hero: React.FC<HeroProps> = ({
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

  containerRadius = DEFAULTS.containerRadius,
  avatarSize = DEFAULTS.avatarSize,
  avatarRadius = DEFAULTS.avatarRadius,
  blurRadius = DEFAULTS.blurRadius,
  titleLines = DEFAULTS.titleLines,

  topLeftNode,
}) => {
  const theme = useAppTheme();
  const isTitleOnly = !subtitle;

  const bgSource =
    (backgroundUri ? { uri: backgroundUri } : undefined) ??
    (avatarUri ? { uri: avatarUri } : undefined) ??
    backgroundFallback ??
    avatarFallback;

  return (
    <View
      style={[styles.wrapper, { borderRadius: containerRadius }]}
      testID={testID}
    >
      <Image
        source={bgSource}
        style={RNStyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={blurRadius}
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

      {topLeftNode ? (
        <View style={styles.topLeftNode}>{topLeftNode}</View>
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
          size={avatarSize}
          radius={avatarRadius}
          shadow
        />

        <Text
          style={[
            styles.title,
            isTitleOnly ? styles.titleOnlyTitle : undefined,
            { color: theme.text },
          ]}
          numberOfLines={titleLines}
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
  },
  topLeftNode: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 6,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  contentWithMeta: {
    gap: 8,
    paddingVertical: 18,
  },
  titleOnlyContent: {
    gap: 6,
    paddingTop: 18,
    paddingBottom: 16,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
    paddingHorizontal: 24,
  },
  titleOnlyTitle: {
    fontWeight: "700",
    lineHeight: 28,
    letterSpacing: 0,
  },
  metaRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  fab: {
    position: "absolute",
    top: spacing[3],
    right: spacing[3],
    zIndex: 5,
  },
});
