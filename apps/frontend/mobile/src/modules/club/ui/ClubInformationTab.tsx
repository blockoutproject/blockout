import React, { useMemo } from "react";
import { Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import {layout, useAppTheme} from "@/src/shared/theme";
import { InfoCard, InfoRow } from "@/src/modules/club/ui/ClubInfoCard";

import type { ClubResponse } from "@/src/shared/generated/models";
import ClubMapCard from "./ClubMapCard";

type ClubInformationsTabProps = {
  club: ClubResponse;
  scrollY: Animated.Value;
};

const ClubInformationsTab: React.FC<ClubInformationsTabProps> = ({
  club,
  scrollY,
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const websiteDisplay = useMemo(() => {
    return club?.website
      ? String(club.website).replace(/^https?:\/\//, "")
      : null;
  }, [club?.website]);

  const openWebsite = () => {
    if (!club?.website) return;
    const url = club.website.startsWith("http")
      ? club.website
      : `https://${club.website}`;
    Linking.openURL(url);
  };

  const openMail = () => {
    if (!club?.email) return;
    Linking.openURL(`mailto:${club.email}`);
  };

  const openPhone = () => {
    if (!club?.phoneNumber) return;
    Linking.openURL(`tel:${club.phoneNumber}`);
  };

  const openMap = () => {
    const query = encodeURIComponent(
      `${club.name}${club.city ? " " + club.city : ""}${club.address ? " " + club.address : ""}`,
    );
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.scrollContent,
        {
          backgroundColor: theme.background,
          paddingTop: layout.tabs + 12,
          paddingBottom: insets.bottom + layout.bottomNavigation + 12,
        },
      ]}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false },
      )}
      scrollEventThrottle={16}
      testID="club-info-scroll"
    >
      <InfoCard title="Coordonnées">
        <InfoRow
          icon="email-outline"
          label="Email"
          value={club.email ?? null}
          onPress={openMail}
          isLink
        />
        <InfoRow
          icon="phone-outline"
          label="Téléphone"
          value={club.phoneNumber ?? null}
          onPress={openPhone}
          isLink
        />
        <InfoRow
          icon="link-variant"
          label="Site web"
          value={websiteDisplay}
          onPress={openWebsite}
          isLink
        />
        <InfoRow icon="map-marker" label="Ville" value={club.city ?? null} />
        <InfoRow
          icon="map-marker-outline"
          label="Adresse"
          value={club.address ?? null}
        />
        <InfoRow
          icon="map-outline"
          label="Voir sur la carte"
          value="Ouvrir la carte"
          onPress={openMap}
          isLink
        />
      </InfoCard>

      <ClubMapCard club={club} />
    </Animated.ScrollView>
  );
};

export default ClubInformationsTab;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 8,
    gap: 20,
  },
});
