import React from "react";
import {StyleSheet, StyleSheet as RNStyleSheet, Text, View,} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {Image} from "expo-image";
import {LinearGradient} from "expo-linear-gradient";

import {useAppTheme} from "@/src/context/ThemeProvider";
import {withAlpha} from "@/src/utils/utils";

const MatchAdHeader: React.FC = () => {
  const theme = useAppTheme();

  const backgroundSource = require("@/assets/clubs/default_club_logo.png");

  return (
    <View style={styles.container}>
      <Image
        source={backgroundSource}
        style={RNStyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={60}
        transition={0}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha(theme.surface, 0.9),
          withAlpha(theme.surface, 0.6),
          withAlpha(theme.surface, 0.9),
        ]}
        locations={[0, 0.5, 1]}
        start={{x: 0, y: 0.5}}
        end={{x: 1, y: 0.5}}
        style={RNStyleSheet.absoluteFill}
      />

      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrapper,
              {backgroundColor: withAlpha(theme.text, 0.12)},
            ]}
          >
            <Ionicons
              name="megaphone-outline"
              size={18}
              color={withAlpha(theme.text, 0.9)}
            />
          </View>

          <View style={{flex: 1}}>
            <Text
              style={[
                styles.headerTitle,
                {color: theme.text},
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              lineBreakStrategyIOS="push-out"
              textBreakStrategy="highQuality"
            >
              Annonce sponsorisée
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default React.memo(MatchAdHeader);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
  },
});
