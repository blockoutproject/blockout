import React from "react";
import {DimensionValue, Pressable, StyleSheet, Text, TextStyle, View,} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useAppTheme} from "@/src/context/ThemeProvider";
import FadeIn from "@/src/components/common/animations/FadeIn";
import MaskedImage from "@/src/components/common/images/MaskedImage";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import InfoPillGradient from "@/src/components/common/chips/InfoPillGradient";

export type EntityCardChip = {
  label: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  maxWidth?: DimensionValue;
  labelStyle?: TextStyle;
  /** Couleur de bordure spécifique à cette pill. */
  borderColor?: string;
  /** Couleur de fond spécifique à cette pill. */
  backgroundColor?: string;
  /** Gradient spécifique pour cette pill (optionnel). */
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
  allowChipWrap?: boolean;
};

const EntityGradientCard: React.FC<EntityGradientCardProps> = ({
                                                                 title,
                                                                 imageUri,
                                                                 chips = [],
                                                                 onPress,
                                                                 testID,
                                                                 logoSize = 44,
                                                                 borderRadius = 16,
                                                                 padding = 8,
                                                                 marginBottom = 8,
                                                                 gradient,
                                                               }) => {
  const theme = useAppTheme();

  const effectiveGradient =
    gradient ?? [
      theme.border,
      theme.borderSecondary,
      theme.borderSecondary,
    ];

  const hasChips = chips.length > 0;

  return (
    <FadeIn>
      <Pressable
        onPress={onPress}
        testID={testID}
        style={{marginBottom}}
      >
        <GradientBorderView
          gradient={effectiveGradient}
          borderRadius={borderRadius}
          borderWidth={1}
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              padding,
            },
          ]}
        >
          <View style={styles.mainRow}>
            <MaskedImage
              uri={imageUri}
              size={logoSize}
              radius={12}
              style={styles.logo}
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
                adjustsFontSizeToFit
                lineBreakStrategyIOS="push-out"
                textBreakStrategy="highQuality"
              >
                {title}
              </Text>
            </View>
          </View>

          {hasChips && (
            <View style={styles.chipsContainer}>
              <View style={styles.chipsRow}>
                {chips.map((chip, idx) => (
                  <InfoPillGradient
                    key={`${chip.label}-${idx}`}
                    label={chip.label}
                    leftIcon={chip.icon}
                    size="sm"
                    variant="border"
                    maxWidth={chip.maxWidth}
                    gradient={chip.gradient}
                    labelStyle={
                      chip.labelStyle ?? {
                        fontSize: 11,
                        color: theme.textSecondary,
                      }
                    }
                    backgroundColor={chip.backgroundColor ?? theme.surface}
                    borderColor={chip.borderColor ?? theme.border}
                  />
                ))}
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
    gap: 8,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  chipsContainer: {
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
});
