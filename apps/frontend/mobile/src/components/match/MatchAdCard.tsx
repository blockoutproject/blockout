import React, {useState} from "react";
import {ActivityIndicator, StyleSheet, View} from "react-native";
import {BannerAd, BannerAdSize} from "react-native-google-mobile-ads";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import GradientBorderView from "@/src/shared/ui/GradientBorderView";
import {withAlpha} from "@/src/utils/utils";
import MatchAdHeader from "@/src/components/match/MatchAdHeader";
import {ADS} from "@/src/shared/config/ads";

const MatchAdCard: React.FC = () => {
  const theme = useAppTheme();
  const [isLoading, setIsLoading] = useState(true);

  const greyGradient = [
    withAlpha(theme.text, 0.24),
    withAlpha(theme.text, 0.14),
    withAlpha(theme.text, 0.24),
  ] as const;

  return (
    <GradientBorderView
      gradient={greyGradient}
      borderRadius={RADIUS}
      borderWidth={1}
      style={[styles.card, {backgroundColor: theme.surface}]}
    >
      <View style={styles.innerClip}>
        <MatchAdHeader/>

        <View style={styles.body}>
          <View style={styles.bannerContainer}>
            {isLoading && (
              <View
                style={[styles.loaderWrapper]}
              >
                <ActivityIndicator size="small" color={theme.textInactive}/>
              </View>
            )}

            <BannerAd
              unitId={ADS.BANNER_MATCH}
              size={BannerAdSize.LARGE_BANNER}
              onAdLoaded={() => setIsLoading(false)}
              onAdFailedToLoad={() => setIsLoading(false)}
            />
          </View>
        </View>
      </View>
    </GradientBorderView>
  );
};

export default React.memo(MatchAdCard);

const RADIUS = 16;

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS,
  },
  innerClip: {
    borderRadius: RADIUS - 1,
    overflow: "hidden",
  },
  body: {
    paddingVertical: 8,
  },
  bannerContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  loaderWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
