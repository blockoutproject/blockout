import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  iconSize,
  borderWidth,
  radius,
  spacing,
  stateOpacity,
  typography,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
import FadeIn from "@/src/shared/ui/animations/fade-in";
import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import { Pill } from "@/src/shared/ui/pill";

export type EntityCardMetadata = {
  label: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
};

export type EntityCardPresentation = {
  title: string;
  imageUri?: string | null;
  metadata: EntityCardMetadata[];
  gradient?: readonly [string, string, ...string[]];
};

export type EntityCardPalette = {
  neutral: string;
  male: string;
  female: string;
  mixed: string;
};

export type EntityCardProps = {
  presentation: EntityCardPresentation;
  onPress: () => void;
  testID?: string;
};

const EntityCard = ({ presentation, onPress, testID }: EntityCardProps) => {
  const theme = useAppTheme();
  const gradient =
    presentation.gradient ??
    ([
      theme.borderSecondary,
      theme.borderSecondary,
      theme.borderSecondary,
    ] as const);

  return (
    <FadeIn>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={presentation.title}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          styles.pressable,
          pressed ? styles.pressed : undefined,
        ]}
      >
        <GradientBorderView
          gradient={gradient}
          borderRadius={radius.card}
          borderWidth={borderWidth.thin}
          style={[styles.card, { backgroundColor: theme.surface }]}
        >
          <View style={styles.mainRow}>
            <MaskedImage
              uri={presentation.imageUri}
              size={iconSize.illustration}
              radius={radius.md}
              shadow
            />

            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={2}
              lineBreakStrategyIOS="push-out"
              textBreakStrategy="highQuality"
            >
              {presentation.title}
            </Text>
          </View>

          {presentation.metadata.length > 0 ? (
            <View style={styles.metadataRow}>
              {presentation.metadata.map((item, index) => (
                <Pill
                  key={`${item.label}-${index}`}
                  label={item.label}
                  leftIcon={item.icon}
                  size="sm"
                  labelStyle={{
                    ...typography.captionStrong,
                    color: theme.textSecondary,
                  }}
                  backgroundColor={withAlpha(item.color, 0.12)}
                  borderColor={item.color}
                />
              ))}
            </View>
          ) : null}
        </GradientBorderView>
      </Pressable>
    </FadeIn>
  );
};

export default EntityCard;

const styles = StyleSheet.create({
  pressable: {
    marginBottom: spacing[3],
  },
  card: {
    minHeight: 90,
    flexDirection: "column",
    gap: spacing[2],
    padding: spacing[3],
    borderCurve: "continuous",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  title: {
    ...typography.control,
    flex: 1,
  },
  metadataRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing[1],
  },
  pressed: {
    opacity: stateOpacity.pressed,
  },
});
