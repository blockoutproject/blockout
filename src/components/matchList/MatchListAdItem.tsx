import React from "react";
import { View, StyleSheet } from "react-native";
import {
    BannerAd,
    BannerAdSize,
} from "react-native-google-mobile-ads";

import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientBorderView from "@/src/components/common/GradientBorderView";
import FadeIn from "@/src/components/common/animations/FadeIn";
import { SECTION_SEPARATOR_HEIGHT } from "@/src/theme/globals";
import { withAlpha } from "@/src/utils/utils";
import MatchListAdHeader from "./MatchListAdHeader";
import { ADS } from "@/src/config/ads";

export type MatchListAdItemProps = {};

/**
 * Carte d’annonce insérée dans la liste de matchs,
 * avec un style proche de PoolItem / RankingHeader.
 */
const MatchListAdItem: React.FC<MatchListAdItemProps> = () => {
    const theme = useAppTheme();

    const greyGradient = [
        withAlpha(theme.text, 0.24),
        withAlpha(theme.text, 0.14),
        withAlpha(theme.text, 0.24),
    ] as const;

    return (
        <FadeIn>
            <View style={styles.wrapper}>
                <GradientBorderView
                    gradient={greyGradient}
                    borderRadius={RADIUS}
                    borderWidth={1}
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.surface,
                        },
                    ]}
                >
                    <View style={styles.innerClip}>
                        <MatchListAdHeader />

                        <View style={styles.body}>
                            <View style={styles.bannerContainer}>
                                <BannerAd
                                    unitId={ADS.BANNER_HOME}
                                    size={BannerAdSize.LARGE_BANNER}
                                />
                            </View>
                        </View>
                    </View>
                </GradientBorderView>
            </View>
        </FadeIn>
    );
};

export default React.memo(MatchListAdItem);

const RADIUS = 16;

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: SECTION_SEPARATOR_HEIGHT,
    },
    card: {
        borderRadius: RADIUS,
    },
    innerClip: {
        borderRadius: RADIUS - 1,
        overflow: "hidden",
    },
    body: {
        paddingVertical: 8,
        paddingHorizontal: 30,
    },
    bannerContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
});