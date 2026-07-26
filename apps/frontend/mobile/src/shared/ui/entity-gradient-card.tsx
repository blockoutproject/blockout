import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  type DimensionValue,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from "react-native";

import {
  borderWidth,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import FadeIn from "@/src/shared/ui/animations/fade-in";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import { GradientPill, Pill } from "@/src/shared/ui/pill";

export type EntityCardChip = {
  label: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  maxWidth?: DimensionValue;
  labelStyle?: TextStyle;
  borderColor?: string;
  backgroundColor?: string;
  gradient?: readonly [string, string, ...string[]];
};

export type EntityGradientCardProps = {
  title: string;
  imageUri?: string | null;
  chips?: EntityCardChip[];
  onPress: () => void;
  testID?: string;
  logoSize?: number;
  borderRadius?: number;
  padding?: number;
  marginBottom?: number;
  gradient?: readonly [string, string, ...string[]];
  minHeight?: number;
};

const EntityGradientCard: React.FC<EntityGradientCardProps> = ({
  title,
  imageUri,
  chips = [],
  onPress,
  testID,
  logoSize = 44,
  borderRadius = radius.card,
  padding = spacing[2],
  marginBottom = spacing[3],
  gradient,
  minHeight,
}) => {
  const theme = useAppTheme();

  const effectiveGradient =
    gradient ??
    ([
      theme.borderSecondary,
      theme.borderSecondary,
      theme.borderSecondary,
    ] as const);

  const hasChips = chips.length > 0;

  return (
    <FadeIn>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          { marginBottom },
          pressed ? styles.pressed : undefined,
        ]}
      >
        <GradientBorderView
          gradient={effectiveGradient}
          borderRadius={borderRadius}
          borderWidth={borderWidth.thin}
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              padding,
              minHeight,
            },
          ]}
        >
          <View style={styles.mainRow}>
            <MaskedImage
              uri={imageUri}
              size={logoSize}
              radius={radius.md}
              shadow
            />

            <View style={styles.content}>
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.text,
                  },
                ]}
                numberOfLines={2}
                lineBreakStrategyIOS="push-out"
                textBreakStrategy="highQuality"
              >
                {title}
              </Text>
            </View>
          </View>

          {!!hasChips && (
            <View>
              <View style={styles.chipsRow}>
                {chips.map((chip, idx) => {
                  const commonProps = {
                    label: chip.label,
                    leftIcon: chip.icon,
                    size: "sm" as const,
                    maxWidth: chip.maxWidth,
                    labelStyle: chip.labelStyle ?? {
                      ...typography.captionStrong,
                      color: theme.textSecondary,
                    },
                    backgroundColor: chip.backgroundColor ?? theme.surface,
                    borderColor: chip.borderColor ?? theme.border,
                  };

                  return chip.gradient ? (
                    <GradientPill
                      key={`${chip.label}-${idx}`}
                      {...commonProps}
                      gradient={chip.gradient}
                    />
                  ) : (
                    <Pill key={`${chip.label}-${idx}`} {...commonProps} />
                  );
                })}
              </View>
            </View>
          )}
        </GradientBorderView>
      </Pressable>
    </FadeIn>
  );
};

export default EntityGradientCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: "column",
    gap: spacing[2],
    borderCurve: "continuous",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.control,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing[1],
  },
  pressed: { opacity: 0.9 },
});
