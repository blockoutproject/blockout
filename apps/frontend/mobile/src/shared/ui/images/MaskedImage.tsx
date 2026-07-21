import React, {memo} from "react";
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from "react-native";
import {Image, type ImageProps} from "expo-image";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import * as Haptics from "expo-haptics";

export type MaskedImageProps = {
  uri?: string | null;
  fallback?: ImageProps["source"];
  size: number;
  radius?: number;
  backgroundColor?: string;
  contentFit?: "contain" | "cover";
  borderWidth?: number;
  borderColor?: string;
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLoad?: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

const MaskedImage: React.FC<MaskedImageProps> = memo(
  function MaskedImage({
     uri,
     fallback = require("@/assets/clubs/default_club_logo.png"),
     size,
     radius,
     backgroundColor,
     contentFit = "cover",
     borderWidth = 0,
     borderColor,
     shadow = false,
     style,
     onPress,
     onLoad,
     accessibilityLabel,
     testID,
   }: MaskedImageProps) {
    const theme = useAppTheme();
    const r = radius ?? Math.round(size * 0.28);

    const handlePress = async () => {
      if (onPress) {
        await Haptics.selectionAsync();
        onPress();
      }
    };

    const image = (
      <Image
        source={uri ? {uri} : fallback}
        style={{width: "100%", height: "100%"}}
        contentFit={contentFit}
        onLoad={onLoad}
      />
    );
    const containerStyle = [
      {
        width: size,
        aspectRatio: 1,
        borderRadius: r,
        overflow: "hidden" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: backgroundColor ?? theme.text,
        borderWidth,
        borderColor: borderColor ?? "transparent",
      },
      style,
    ];

    return (
      <View style={[shadow && styles.shadow]}>
        {onPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? "Ouvrir l’image"}
            onPress={handlePress}
            style={containerStyle}
            testID={testID}
          >
            {image}
          </Pressable>
        ) : (
          <View style={containerStyle} testID={testID}>{image}</View>
        )}
      </View>
    );
  },
);

export default MaskedImage;

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
});
