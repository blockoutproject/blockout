import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import {
  borderWidth,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import {
  type MatchResponse,
  MatchStatusEnum,
} from "@/src/shared/generated/models";
import { GradientPill } from "@/src/shared/ui/pill";
import { useRouter } from "expo-router";
import { openPdf } from "@/src/modules/pdf/api/open-pdf";
import { isLNV } from "@/src/shared/view-models/league";
import { useAdvertising } from "@/src/modules/advertising/providers/advertising-provider";

/** Info card with league/pool/date/venue/referees. */
export type MatchInfoCardProps = {
  /** Match returned by the mobile gateway. */
  match: MatchResponse;
};

const MatchInfoCard: React.FC<MatchInfoCardProps> = ({ match }) => {
  const theme = useAppTheme();
  const router = useRouter();
  const { handleNavigationWithAd } = useAdvertising();

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

  const dateLabel =
    rawDateLabel.charAt(0).toUpperCase() + rawDateLabel.slice(1);

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
    [router, handleNavigationWithAd],
  );

  return (
    <GradientBorderView
      gradient={gradient}
      borderRadius={radius.hero}
      borderWidth={borderWidth.thin}
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

      <View style={styles.pillsWrap}>
        <GradientPill
          leftIcon="trophy-variant"
          label={leagueLabel}
          gradient={gradient}
          borderWidth={borderWidth.thin}
        />
        <GradientPill
          leftIcon="calendar"
          label={dateLabel}
          gradient={gradient}
          borderWidth={borderWidth.thin}
        />
        {!matchAddressPdfUrl && (
          <GradientPill
            leftIcon="map-marker"
            label={venue}
            gradient={gradient}
            borderWidth={borderWidth.thin}
          />
        )}
        {!!ref1 && (
          <GradientPill
            leftIcon="whistle"
            label={ref1}
            gradient={gradient}
            borderWidth={borderWidth.thin}
          />
        )}
        {!!ref2 && (
          <GradientPill
            leftIcon="whistle"
            label={ref2}
            gradient={gradient}
            borderWidth={borderWidth.thin}
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
            borderWidth={borderWidth.thin}
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
    borderRadius: radius.hero,
    padding: spacing[4],
    gap: spacing[4],
  },
  title: {
    ...typography.compactStrong,
    textTransform: "uppercase",
  },
  pillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
});
