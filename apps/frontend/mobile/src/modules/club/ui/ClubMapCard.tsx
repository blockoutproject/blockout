import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Camera,
  type CameraRef,
  CircleLayer,
  Images,
  MapView,
  ShapeSource,
  SymbolLayer,
} from "@maplibre/maplibre-react-native";

import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import { CONFIG } from "@/src/shared/config/config";
import type { ClubResponse } from "@/src/modules/club/model/Club";

const RADIUS = 18;

function hasCoord(
  lat: number | null | undefined,
  lng: number | null | undefined,
): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

const DEFAULT_CENTER: [number, number] = [1.888334, 46.603354];
const DEFAULT_ZOOM = 5;

const iconIdForClub = (clubId: string) => `club-logo-${clubId}`;

type Props = {
  club: ClubResponse;
};

const ClubMapCard: React.FC<Props> = ({ club }) => {
  const theme = useAppTheme();
  const cameraRef = useRef<CameraRef>(null);

  const hasCoords = hasCoord(club.latitude, club.longitude);

  const clubId = String(club.id);
  const iconId = iconIdForClub(clubId);

  const featureCollection = useMemo(() => {
    if (!hasCoords) {
      return {
        type: "FeatureCollection" as const,
        features: [],
      };
    }

    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          id: clubId,
          properties: {
            clubId,
            iconId,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [
              club.longitude as number,
              club.latitude as number,
            ] as [number, number],
          },
        },
      ],
    };
  }, [clubId, iconId, club.longitude, club.latitude, hasCoords]);

  const images = useMemo(() => {
    const img: Record<string, { uri: string }> = {};
    const logoUrl = club.logoUrl ?? undefined;
    if (logoUrl) img[iconId] = { uri: logoUrl };
    return img;
  }, [club, iconId]);

  const initialCamera = useMemo(() => {
    if (!hasCoords) return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
    return {
      center: [club.longitude as number, club.latitude as number] as [
        number,
        number,
      ],
      zoom: 12,
    };
  }, [club.longitude, club.latitude, hasCoords]);

  const fitPoint = useCallback(() => {
    if (!cameraRef.current) return;
    if (!hasCoords) return;

    cameraRef.current.setCamera({
      centerCoordinate: [club.longitude as number, club.latitude as number],
      zoomLevel: 12,
      animationDuration: 0,
    });
  }, [club.longitude, club.latitude, hasCoords]);

  const hasLogo = Object.keys(images).length > 0;

  return (
    <View
      style={[
        styles.innerClip,
        {
          borderColor: theme.primary,
          backgroundColor: theme.surface,
        },
      ]}
    >
      <MapView
        style={StyleSheet.absoluteFill}
        mapStyle={CONFIG.MAP_URL}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={fitPoint}
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

        <ShapeSource id="club-source" shape={featureCollection}>
          <CircleLayer
            id="club-circle-bg"
            style={{
              circleRadius: 20,
              circleColor: theme.text,
              circleStrokeColor: theme.primary,
              circleStrokeWidth: 3,
            }}
          />

          {hasLogo ? (
            <SymbolLayer
              id="club-logo-layer"
              style={{
                iconImage: ["get", "iconId"],
                iconSize: 0.055,
                iconAllowOverlap: true,
                iconIgnorePlacement: true,
              }}
            />
          ) : (
            <CircleLayer
              id="club-dot-fallback"
              style={{
                circleRadius: 10,
                circleColor: theme.primary,
                circleStrokeColor: theme.text,
                circleStrokeWidth: 3,
              }}
            />
          )}
        </ShapeSource>
      </MapView>

      {!hasCoords ? (
        <View pointerEvents="none" style={styles.noCoords}>
          <Text style={[styles.noCoordsTitle, { color: theme.text }]}>
            Localisation indisponible
          </Text>
          <Text style={[styles.noCoordsSub, { color: theme.textInactive }]}>
            Ce club n’a pas de latitude/longitude.
          </Text>
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.attribution}>
        <Text style={styles.attributionText}>
          © OpenStreetMap contributors
        </Text>
      </View>
    </View>
  );
};

export default ClubMapCard;

const styles = StyleSheet.create({
  innerClip: {
    borderRadius: RADIUS - 1,
    overflow: "hidden",
    height: 220,
    borderWidth: 2,
  },
  noCoords: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  noCoordsTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  noCoordsSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
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
