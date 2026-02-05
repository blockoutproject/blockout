import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import { MapView, Camera, CameraRef, PointAnnotation } from "@maplibre/maplibre-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import type { EnrichedPoolDTO } from "@/src/types/Pool";
import type { TeamWithStats } from "@/src/types/Team";
import MaskedImage from "../../common/images/MaskedImage";
import { CORNERS } from "@/src/theme/globals";
import { CONFIG } from "@/src/config/config";
import { useNavigationInterstitial } from "@/src/hooks/ads/useNavigationInterstitial";

type Props = {
    enrichedPool: EnrichedPoolDTO;
};

const RADIUS = 18;

function hasCoord(lat: number | null, lng: number | null): lat is number {
    return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
}

const DEFAULT_CENTER: [number, number] = [1.888334, 46.603354];
const DEFAULT_ZOOM = 5;

const EDGE_PADDING = 60;

function computeBounds(coords: Array<[number, number]>) {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const [lng, lat] of coords) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }

    const southWest: [number, number] = [minLng, minLat];
    const northEast: [number, number] = [maxLng, maxLat];

    return { southWest, northEast };
}

const PoolMapCard: React.FC<Props> = ({ enrichedPool }) => {
    const router = useRouter();
    const { division } = enrichedPool;
    const { handleNavigationWithAd } = useNavigationInterstitial();

    const cameraRef = useRef<CameraRef>(null);
    const annotationRefs = useRef<Record<string, { refresh?: () => void } | null>>({});

    const teamsWithCoords = useMemo(() => {
        return enrichedPool.ranking.filter((t) => hasCoord(t.latitude, t.longitude));
    }, [enrichedPool.ranking]);

    const points = useMemo(
        () =>
            teamsWithCoords.map((team) => ({
                id: String(team.id),
                team: team as TeamWithStats,
                coordinate: [team.longitude as number, team.latitude as number] as [number, number],
            })),
        [teamsWithCoords]
    );

    const initialCamera = useMemo(() => {
        if (points.length === 0) return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
        if (points.length === 1) return { center: points[0].coordinate, zoom: 10 };

        const avgLng = points.reduce((s, p) => s + p.coordinate[0], 0) / points.length;
        const avgLat = points.reduce((s, p) => s + p.coordinate[1], 0) / points.length;

        return { center: [avgLng, avgLat] as [number, number], zoom: 6 };
    }, [points]);

    const fitAllPoints = useCallback(() => {
        if (!cameraRef.current) return;
        if (points.length === 0) return;

        if (points.length === 1) {
            cameraRef.current.setCamera({
                centerCoordinate: points[0].coordinate,
                zoomLevel: 10,
                animationDuration: 0,
            });
            return;
        }

        const coords = points.map((p) => p.coordinate);
        const { southWest, northEast } = computeBounds(coords);

        cameraRef.current.fitBounds(northEast, southWest, EDGE_PADDING, 0);
    }, [points]);

    const handleMarkerPress = useCallback(
        async (team: TeamWithStats) => {
            await Haptics.selectionAsync();

            handleNavigationWithAd(() => {
                router.push(`/team/${team.id}`);
            });
        },
        [router, handleNavigationWithAd]
    );

    const refreshAnnotation = useCallback((id: string) => {
        const ref = annotationRefs.current[id];
        ref?.refresh?.();
    }, []);

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

                {points.map(({ id, coordinate, team }) => (
                    <PointAnnotation
                        key={id}
                        id={id}
                        coordinate={coordinate}
                        onSelected={() => handleMarkerPress(team)}
                        ref={(ref) => {
                            annotationRefs.current[id] = ref as any;
                        }}
                    >
                        <MaskedImage
                            uri={team.logoUrl}
                            size={42}
                            radius={CORNERS}
                            contentFit="contain"
                            borderWidth={2}
                            borderColor={division.mainColor}
                            shadow
                            onLoad={() => refreshAnnotation(id)}
                        />
                    </PointAnnotation>
                ))}
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