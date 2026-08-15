import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  iconSize,
  colors,
  borderWidth,
  fontWeight,
  gradients,
  layout,
  radius,
  spacing,
  typography,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
import { usePurchases } from "@/src/modules/subscription/providers/purchases-provider";
import { useSessionState } from "@/src/modules/session/providers/session-context";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import { Action } from "@/src/shared/ui/action";

type Props = {
  subtitle?: string;
};

const ProUpsellTab: React.FC<Props> = ({
  subtitle = "Cette fonctionnalité est disponible avec Blockout Pro.",
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useSessionState();
  const { isPro, isHydrated, presentPaywall } = usePurchases();
  const [loading, setLoading] = useState(false);

  const canShowCta = isAuthenticated && isHydrated && !isPro;

  const handleOpenPro = useCallback(async () => {
    try {
      setLoading(true);
      await Haptics.selectionAsync();
      await presentPaywall();
    } finally {
      setLoading(false);
    }
  }, [presentPaywall]);

  const badge = useMemo(
    () => (
      <View style={styles.badgeRow}>
        <MaskedImage
          fallback={require("@/assets/images/blockout-logo-dark.png")}
          size={iconSize.navigation}
          radius={7}
        />
        <View style={styles.brandCol}>
          <Text style={[styles.brand, { color: theme.text }]}>Blockout</Text>
          <Text style={[styles.pro, { color: theme.gold }]}>Pro</Text>
        </View>
      </View>
    ),
    [theme.gold, theme.text],
  );

  return (
    <View
      style={[
        styles.container,
        {
          marginTop: layout.tabs + 8,
          paddingBottom:
            insets.bottom +
            layout.bottomNavigation +
            layout.sectionSeparator +
            4,
          backgroundColor: theme.background,
        },
      ]}
      testID="pro-upsell-tab"
    >
      <View
        style={[
          styles.fullCard,
          {
            backgroundColor: theme.surface,
            borderColor: withAlpha(theme.text, 0.08),
          },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(theme.gold, 0.22), colors.transparent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.content}>
          {badge}

          <View style={styles.messageRow}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor: withAlpha(theme.gold, 0.14),
                  borderColor: withAlpha(theme.gold, 0.28),
                },
              ]}
            >
              <MaterialCommunityIcons
                name="lock-outline"
                size={iconSize.control}
                color={theme.gold}
              />
            </View>

            <Text
              style={[styles.subtitle, { color: withAlpha(theme.text, 0.86) }]}
            >
              {subtitle}
            </Text>
          </View>

          <View style={styles.spacer} />

          {canShowCta ? (
            <Action
              onPress={handleOpenPro}
              label="Passer à Pro"
              loading={loading}
              loadingLabel="Ouverture…"
              leftIcon={
                <MaterialCommunityIcons
                  name="rocket-launch-outline"
                  size={iconSize.control}
                  color={theme.onPrimary}
                />
              }
              textColor={theme.onPrimary}
              fullWidth
              gradient={gradients.premium}
              testID="subscription-upgrade-action"
            />
          ) : (
            <Text style={[styles.hint, { color: withAlpha(theme.text, 0.7) }]}>
              Connecte-toi pour voir l’offre, ou vérifie ton statut Pro.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default ProUpsellTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[1],
  },

  fullCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.hero,
    overflow: "hidden",
  },

  content: {
    flex: 1,
    padding: spacing[6],
    justifyContent: "center",
    gap: spacing[3],
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.tight,
    alignSelf: "center",
  },
  brandCol: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.tight,
  },
  brand: {
    fontFamily: typography.brandDisplay.fontFamily,
    fontSize: typography.brandDisplay.fontSize,
    fontWeight: fontWeight.black,
  },
  pro: {
    fontFamily: typography.brandDisplayRegular.fontFamily,
    fontSize: typography.brandDisplayRegular.fontSize,
    fontWeight: fontWeight.regular,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.compact,
    paddingTop: spacing.tight,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidth.thin,
  },
  subtitle: {
    flex: 1,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    fontWeight: fontWeight.bold,
  },

  spacer: { height: 6 },

  hint: {
    fontSize: typography.label.fontSize,
    fontWeight: fontWeight.bold,
    textAlign: "center",
    paddingTop: 2,
  },
});
