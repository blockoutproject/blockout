import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Pressable,
  StyleSheet,
  StyleSheet as RNStyleSheet,
  Text,
  View,
} from "react-native";

import MaskedImage from "@/src/shared/ui/images/masked-image";
import { isRegional } from "@/src/shared/view-models/league";
import type { PoolResponse } from "@/src/shared/generated/models";
import {
  elevation,
  iconSize,
  radius,
  spacing,
  typography,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
import { GenderLabels } from "@/src/shared/view-models/gender-labels";

type Props = {
  pool: PoolResponse;
  onPress: () => void;
};

const RankingHeader: React.FC<Props> = ({ pool, onPress }) => {
  const theme = useAppTheme();
  const divisionLogo = pool.division.logoUrl
    ? { uri: pool.division.logoUrl }
    : require("@/assets/clubs/default_club_logo.png");

  const isReg = isRegional(pool.leagueCode);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir la poule ${pool.shortName}`}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      testID={`ranking-pool-action-${pool.id}`}
    >
      <Image
        source={divisionLogo}
        style={RNStyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={60}
        transition={0}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha(theme.surface, 0.8),
          withAlpha(theme.surface, 0.5),
          withAlpha(theme.surface, 0.8),
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={RNStyleSheet.absoluteFill}
      />
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MaskedImage
            uri={pool.division.logoUrl}
            size={26}
            radius={radius.sm}
            style={styles.logo}
            shadow
          />
          <View style={styles.textContent}>
            <Text
              style={[styles.headerTitle, { color: theme.text }]}
              lineBreakStrategyIOS="push-out"
              textBreakStrategy="highQuality"
              numberOfLines={2}
            >
              {pool.shortName}
            </Text>
            <Text
              style={[
                styles.divisionTitle,
                {
                  color: theme.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {`${isReg ? `${pool.leagueName} • ` : ""}${pool.division.name} • ${GenderLabels[pool.gender]}`}
            </Text>
          </View>
        </View>
        <Ionicons
          name="chevron-forward-outline"
          size={iconSize.md}
          color={withAlpha(theme.text, 0.8)}
        />
      </View>
    </Pressable>
  );
};

export default RankingHeader;

const styles = StyleSheet.create({
  headerRow: {
    minHeight: 51,
    paddingHorizontal: 10,
    paddingVertical: spacing[2],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    minWidth: 0,
    flex: 1,
  },
  logo: {
    ...elevation.image,
  },
  textContent: {
    flex: 1,
    gap: 0,
  },
  headerTitle: {
    ...typography.compactStrong,
    flexShrink: 1,
  },
  divisionTitle: {
    flex: 1,
    ...typography.captionStrong,
  },
  pressed: { opacity: 0.85 },
});
