import React from "react";
import {StyleSheet, StyleSheet as RNStyleSheet, Text, TouchableOpacity, View,} from "react-native";
import {Image} from "expo-image";
import type {ImageSource} from "expo-image";
import {LinearGradient} from "expo-linear-gradient";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {withAlpha} from "@/src/shared/lib/utils";
import MaskedImage from "@/src/shared/ui/images/MaskedImage";
import InfoPillGradient from "./chips/InfoPillGradient";
import {CORNERS} from "@/src/shared/theme/tokens";

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

  const bgSource =
    (backgroundUri ? {uri: backgroundUri} : undefined) ??
    (avatarUri ? {uri: avatarUri} : undefined) ??
    (backgroundFallback ?? avatarFallback);

  return (
    <View style={[styles.wrapper, {borderRadius: containerRadius}]} testID={testID}>
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
        start={{x: 0.5, y: 0}}
        end={{x: 0.5, y: 1}}
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
        start={{x: 0, y: 0.5}}
        end={{x: 1, y: 0.5}}
        style={RNStyleSheet.absoluteFill}
      />

      {topLeftNode ? (
        <View style={styles.topLeftNode}>
          {topLeftNode}
        </View>
      ) : null}

      {onEdit ? (
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.85}
          style={[
            styles.fab,
            {
              backgroundColor: withAlpha(theme.surface, 0.85),
              borderColor: withAlpha(theme.text, 0.12),
            },
          ]}
          hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}
          testID={editTestID}
        >
          <MaterialCommunityIcons name="pencil-outline" size={22} color={theme.text}/>
        </TouchableOpacity>
      ) : null}

      <View style={styles.content}>
        <MaskedImage
          uri={avatarUri || undefined}
          size={avatarSize}
          radius={avatarRadius}
          shadow
        />

        <Text style={[styles.title, {color: theme.text}]} numberOfLines={titleLines}>
          {title}
        </Text>

        {!!subtitle && (
          <View style={styles.metaRow}>
            <InfoPillGradient
              label={subtitle}
              leftIcon={subtitleIcon}
              size="lg"
              variant="filled"
              gradient={undefined}
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
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
    paddingHorizontal: 24,
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
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: CORNERS,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
    zIndex: 5,
  },
});
