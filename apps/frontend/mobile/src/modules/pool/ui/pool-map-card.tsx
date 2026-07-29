import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Camera,
  type CameraRef,
  CircleLayer,
  Images,
  MapView,
  type OnPressEvent,
  ShapeSource,
  SymbolLayer,
} from "@maplibre/maplibre-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import type {
  PoolResponse,
  TeamWithStatsResponse,
} from "@/src/shared/generated/models";
import { CONFIG } from "@/src/shared/config/config";
import { useNavigationInterstitial } from "@/src/modules/advertising/hooks/use-navigation-interstitial";
import { useAppTheme } from "@/src/shared/theme";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  getMapCoordinateBounds,
  getMapCoordinateCenter,
  hasMapCoordinate,
  type MapCoordinate,
} from "@/src/shared/model/map-presentation";

type Props = {
  enrichedPool: PoolResponse;
};

const RADIUS = 18;

const EDGE_PADDING = 60;

// Astuce perf : on évite les clés “exotiques” dans le style layer
// et on stocke des string ids simples.
const iconIdForTeam = (teamId: string) => `team-logo-${teamId}`;

const PoolMapCard: React.FC<Props> = ({ enrichedPool }) => {
  const router = useRouter();
  const { division } = enrichedPool;
  const { handleNavigationWithAd } = useNavigationInterstitial();
  const theme = useAppTheme();
  const cameraRef = useRef<CameraRef>(null);

  const teamsWithCoords = useMemo(() => {
    return enrichedPool.ranking.filter((t) =>
      hasMapCoordinate(t.latitude, t.longitude),
    ) as TeamWithStatsResponse[];
  }, [enrichedPool.ranking]);

  // Map pour retrouver vite l’équipe au tap (pas de find O(n) à chaque press)
  const teamById = useMemo(() => {
    const m = new Map<string, TeamWithStatsResponse>();
    for (const t of teamsWithCoords) m.set(String(t.id), t);
    return m;
  }, [teamsWithCoords]);

  // GeoJSON FeatureCollection pour ShapeSource
  const featureCollection = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: teamsWithCoords.map((team) => {
        const teamId = String(team.id);
        return {
          type: "Feature" as const,
          id: teamId,
          properties: {
            teamId,
            iconId: iconIdForTeam(teamId),
          },
          geometry: {
            type: "Point" as const,
            coordinates: [
              team.longitude as number,
              team.latitude as number,
            ] as [number, number],
          },
        };
      }),
    };
  }, [teamsWithCoords]);

  // Images dynamiques (remote) injectées dans la map via <Images />
  // MapLibre va les mettre en cache interne côté moteur.
  const images = useMemo(() => {
    const img: Record<string, { uri: string }> = {};
    for (const team of teamsWithCoords) {
      const teamId = String(team.id);
      if (team.logoUrl) img[iconIdForTeam(teamId)] = { uri: team.logoUrl };
    }
    return img;
  }, [teamsWithCoords]);

  const initialCamera = useMemo(() => {
    if (teamsWithCoords.length === 0)
      return { center: DEFAULT_MAP_CENTER, zoom: DEFAULT_MAP_ZOOM };
    if (teamsWithCoords.length === 1)
      return {
        center: [
          teamsWithCoords[0].longitude as number,
          teamsWithCoords[0].latitude as number,
        ] as [number, number],
        zoom: 10,
      };

    const coordinates = teamsWithCoords.map(
      (team) =>
        [team.longitude as number, team.latitude as number] as MapCoordinate,
    );
    return { center: getMapCoordinateCenter(coordinates), zoom: 6 };
  }, [teamsWithCoords]);

  const fitAllPoints = useCallback(() => {
    if (!cameraRef.current) return;
    if (teamsWithCoords.length === 0) return;

    if (teamsWithCoords.length === 1) {
      cameraRef.current.setCamera({
        centerCoordinate: [
          teamsWithCoords[0].longitude as number,
          teamsWithCoords[0].latitude as number,
        ],
        zoomLevel: 10,
        animationDuration: 0,
      });
      return;
    }

    const coordinates = teamsWithCoords.map(
      (team) =>
        [team.longitude as number, team.latitude as number] as MapCoordinate,
    );
    const { southWest, northEast } = getMapCoordinateBounds(coordinates);
    cameraRef.current.fitBounds(northEast, southWest, EDGE_PADDING, 0);
  }, [teamsWithCoords]);

  const handleSourcePress = useCallback(
    async (e: OnPressEvent) => {
      const feature = e?.features?.[0];
      const teamId = feature?.properties?.teamId
        ? String(feature.properties.teamId)
        : null;
      if (!teamId) return;

      const team = teamById.get(teamId);
      if (!team) return;

      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/team/${team.id}`);
      });
    },
    [handleNavigationWithAd, router, teamById],
  );

  return (
    <View style={[styles.innerClip, { borderColor: division.mainColor }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        mapStyle={CONFIG.MAP_URL}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={fitAllPoints}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: initialCamera.center,
            zoomLevel: initialCamera.zoom,
            animationDuration: 0,
          }}
        />

        <Images images={images} />

        <ShapeSource
          id="teams-source"
          shape={featureCollection}
          onPress={handleSourcePress}
        >
          <CircleLayer
            id="teams-circle-bg"
            style={{
              circleRadius: 22,
              circleColor: theme.text,
              circleStrokeColor: division.mainColor,
              circleStrokeWidth: 3,
            }}
          />

          <SymbolLayer
            id="teams-layer"
            style={{
              iconImage: ["get", "iconId"],
              iconSize: 0.06,
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
            }}
          />
        </ShapeSource>
      </MapView>

      <View pointerEvents="none" style={styles.attribution}>
        <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
};

export default PoolMapCard;

const styles = StyleSheet.create({
  innerClip: {
    borderRadius: RADIUS - 1,
    overflow: "hidden",
    flex: 1,
    borderWidth: 2,
  },
  attribution: {
    position: "absolute",
    bottom: 6,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  attributionText: {
    fontSize: 10,
    color: "#D0D0D0",
  },
});
