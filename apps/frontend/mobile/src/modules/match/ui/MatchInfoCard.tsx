import React, {useCallback} from "react";
import {StyleSheet, Text, View} from "react-native";
import * as Haptics from "expo-haptics";
import {useAppTheme} from "@/src/shared/theme";
import GradientBorderView from "@/src/shared/ui/GradientBorderView";
import {type MatchResponse, MatchStatusEnum} from "@/src/shared/generated/models";
import {GradientPill} from "@/src/shared/ui/pill";
import {useRouter} from "expo-router";
import {openPdf} from "@/src/modules/pdf/openPdf";
import {isLNV} from "@/src/shared/lib/utils";
import {useNavigationInterstitial} from "@/src/modules/advertising/useNavigationInterstitial";

/** Info card with league/pool/date/venue/referees. */
export type MatchInfoCardProps = {
  /** Match returned by the mobile gateway. */
  match: MatchResponse;
};

const RADIUS = 18;

const MatchInfoCard: React.FC<MatchInfoCardProps> = ({match}) => {
  const theme = useAppTheme();
  const router = useRouter();
  const {handleNavigationWithAd} = useNavigationInterstitial();

  const division = match.pool.division;
  const gradient = [
    division.firstGradientColor,
    division.secondGradientColor,
    division.thirdGradientColor,
  ] as const;

  const rawDateLabel = new Date(match.matchDate).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const dateLabel = rawDateLabel.charAt(0).toUpperCase() + rawDateLabel.slice(1);

  const leagueLabel = isLNV(match.pool.leagueCode) ? "Pro" : division.name;
  const venue = match.venue || "Lieu à confirmer";
  const ref1 = match.firstReferee;
  const ref2 = match.secondReferee;
  const matchAddressPdfUrl = match.matchAddressPdfUrl;
  const matchSheetPdfUrl = match.matchSheetPdfUrl;

  const handlePoolPress = useCallback(
    async (poolId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/pool/${poolId}`);
      });
    },
    [router, handleNavigationWithAd]
  );

  return (
    <GradientBorderView
      gradient={gradient}
      borderRadius={RADIUS}
      borderWidth={1}
      style={[
        styles.card,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.text,
          },
        ]}
      >
        Informations
      </Text>

      <View
        style={styles.pillsWrap}
      >

        <GradientPill
          leftIcon="trophy-variant"
          label={leagueLabel}
          gradient={gradient}
          borderWidth={1}
        />
        <GradientPill
          leftIcon="calendar"
          label={dateLabel}
          gradient={gradient}
          borderWidth={1}
        />
        {!matchAddressPdfUrl && (
          <GradientPill
            leftIcon="map-marker"
            label={venue}
            gradient={gradient}
            borderWidth={1}
          />
        )}
        {!!ref1 && (
          <GradientPill
            leftIcon="whistle"
            label={ref1}
            gradient={gradient}
            borderWidth={1}
          />
        )}
        {!!ref2 && (
          <GradientPill
            leftIcon="whistle"
            label={ref2}
            gradient={gradient}
            borderWidth={1}
          />
        )}
        <GradientPill
          label={match.pool.name}
          gradient={gradient}
          treatment="filled"
          onPress={() => handlePoolPress(match.pool.id)}
          rightIcon="chevron-forward-outline"
        />
        {!!matchAddressPdfUrl && (
          <GradientPill
            leftIcon="map-marker"
            rightIcon="chevron-forward-outline"
            label={venue}
            treatment="filled"
            gradient={gradient}
            onPress={async () => openPdf(matchAddressPdfUrl, "Informations")}
            borderWidth={1}
          />
        )}
        {!!matchSheetPdfUrl && match.status === MatchStatusEnum.FINISHED && (
          <GradientPill
            label={"Feuille de match"}
            gradient={gradient}
            treatment="filled"
            onPress={async () => openPdf(matchSheetPdfUrl, "Feuille de match")}
            leftIcon="file-document-outline"
            rightIcon="chevron-forward-outline"
          />
        )}
      </View>
    </GradientBorderView>
  );
};

export default MatchInfoCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS,
    padding: 14,
    gap: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  pillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
