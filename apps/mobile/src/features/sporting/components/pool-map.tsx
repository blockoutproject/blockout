import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import {
  ChevronRight,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react-native";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type LatLng,
} from "react-native-maps";
import type {
  PoolParticipantResponse,
  PoolStandingsResponse,
  PoolSummaryResponse,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { useBottomContentInset } from "@/shared/components/bottom-content-inset";
import { Button } from "@/shared/components/button";
import { IconButton } from "@/shared/components/icon-button";
import { PageScrollView } from "@/shared/components/page";

import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { EmptyState } from "@/shared/components/state-card";
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useReducedMotion } from "@/shared/theme/use-reduced-motion";
import { consultationOpeningPolicy } from "../api/consultation-queries";
import { useConsultationQueries } from "../api/use-consultation-queries";
import { useSportingNavigation } from "../navigation";
import {
  publishedMapRecord,
  type PublishedMapRecord,
} from "../model/published-map-record";
import { SportingLogo } from "./sporting-identity";
import { WinLossBar } from "./standing-performance-bar";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";

/** Before this much clear height, a single row keeps more of the map and team card reachable. */
const compactControlsHeight = 340;

/** One exact pool's participant map; active permits its retained pane's explicit actions. */
export interface PoolMapProps {
  pool: PoolSummaryResponse;
  active?: boolean;
}

/**
 * Keeps authorized camera and team selection mounted through a participant read failure.
 * The basemap owns gestures while the overlay offers one explicit refresh for both resources.
 */
export function PoolMap({ pool, active = true }: Readonly<PoolMapProps>) {
  const queries = useConsultationQueries();
  const participants = useQuery({
    ...queries.participants(pool.pool.id),
    ...consultationOpeningPolicy,
  });
  const standings = useQuery({
    ...queries.standings(pool.pool.id),
    refetchOnMount: false,
    retryOnMount: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const data = participants.data;
  const hasLocations = data?.items.some((item) => item.location) ?? false;
  const failed = hasReadError(participants);
  const recordUnavailable =
    hasReadError(standings) || standings.data?.availability === "unavailable";
  const refreshLoading =
    refreshing && (participants.isFetching || standings.isFetching);

  /** Refetches both existing resources; optional statistics never condition map identity or navigation. */
  async function refresh() {
    if (!active || refreshing) {
      return;
    }
    setRefreshing(true);
    try {
      await Promise.all([
        participants.refetch({ cancelRefetch: false }),
        standings.refetch({ cancelRefetch: false }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.fill}>
      {data && hasLocations && (
        <View
          style={[StyleSheet.absoluteFill, failed && styles.hidden]}
          pointerEvents={failed ? "none" : "auto"}
          accessibilityElementsHidden={failed}
          importantForAccessibility={failed ? "no-hide-descendants" : "auto"}
        >
          <ParticipantMap
            items={data.items}
            standings={standings.data}
            recordUnavailable={recordUnavailable}
            active={active && !failed}
            onRefresh={() => void refresh()}
            refreshing={refreshLoading}
          />
        </View>
      )}
      {failed || (data && !hasLocations) ? (
        <PageScrollView style={styles.fill}>
          <ScreenState>
            {failed ? (
              <ReadFeedback
                key={pool.pool.id}
                query={participants}
                onRetry={async () => {
                  if (active) {
                    await participants.refetch({ cancelRefetch: false });
                  }
                }}
                loadingContent={null}
              />
            ) : (
              <EmptyState
                title="Aucune localisation disponible"
                description="La localisation des équipes n’est pas renseignée."
              >
                <Button
                  label="Actualiser"
                  leadingIcon={RefreshCw}
                  onPress={() => void refresh()}
                  loading={refreshLoading}
                  disabled={!active}
                />
              </EmptyState>
            )}
          </ScreenState>
        </PageScrollView>
      ) : participants.isLoading ? (
        <LoadingGroup label="Chargement des participants" style={styles.fill}>
          <Skeleton height="100%" shape="rectangle" radius={0} />
        </LoadingGroup>
      ) : null}
    </View>
  );
}

/** Exact coordinate equivalence only; every source participant and club location label is retained. */
interface ParticipantPoint {
  key: string;
  coordinate: LatLng;
  items: PoolParticipantResponse[];
}

/** Groups identical numerical coordinates without rounding, displacement or proximity clustering. */
function participantPoints(
  items: readonly PoolParticipantResponse[],
): ParticipantPoint[] {
  const groups = new Map<string, ParticipantPoint>();
  for (const item of items) {
    if (!item.location) {
      continue;
    }
    const { latitude, longitude } = item.location;
    const key = `${latitude}:${longitude}`;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, {
        key,
        coordinate: { latitude, longitude },
        items: [item],
      });
    }
  }
  return [...groups.values()];
}

/** Owns only map interaction; selected data is derived from the latest admitted participants. */
function ParticipantMap({
  items,
  standings,
  recordUnavailable,
  active,
  onRefresh,
  refreshing,
}: Readonly<{
  active: boolean;
  recordUnavailable: boolean;
  items: PoolParticipantResponse[];
  standings: PoolStandingsResponse | undefined;
  onRefresh: () => void;
  refreshing: boolean;
}>) {
  const { colors, scheme } = useTheme();
  const bottomInset = useBottomContentInset();
  const reducedMotion = useReducedMotion();
  const feedback = useActionFeedback();
  const currentActive = useRef(active);
  useLayoutEffect(() => {
    currentActive.current = active;
  }, [active]);
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [mapHeight, setMapHeight] = useState(0);
  const cameraAvailable = ready && mapHeight > 0;
  const cameraActionsDisabled = !active || !cameraAvailable;
  const compactControls =
    mapHeight > 0 && mapHeight - bottomInset <= compactControlsHeight;
  const controlSurface = [
    styles.surfaceControl,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ];
  const bottomAttribution = { left: 0, top: 0, right: 0, bottom: bottomInset };
  const mapAttribution =
    Platform.OS === "android"
      ? { mapPadding: bottomAttribution }
      : {
          legalLabelInsets: { ...bottomAttribution, right: tokens.spacing.md },
          appleLogoInsets: { ...bottomAttribution, left: tokens.spacing.md },
        };
  const [selectedId, setSelectedId] = useState<string>();
  const points = useMemo(() => participantPoints(items), [items]);
  const point = points.find((group) =>
    group.items.some((item) => item.team.team.id === selectedId),
  );
  const selected = point?.items.find(
    (item) => item.team.team.id === selectedId,
  );

  /** Frames current points only at initial readiness or an explicit command, without text geometry. */
  function fit() {
    if (!cameraAvailable || !map.current || !points.length) {
      return;
    }
    const coordinate = points[0].coordinate;
    // A lone marker keeps the existing viewport envelope; these camera bounds create no markers.
    const viewport =
      points.length === 1
        ? [
            {
              latitude: Math.min(90, coordinate.latitude + 0.075),
              longitude: Math.min(180, coordinate.longitude + 0.075),
            },
            {
              latitude: Math.max(-90, coordinate.latitude - 0.075),
              longitude: Math.max(-180, coordinate.longitude - 0.075),
            },
          ]
        : points.map((group) => group.coordinate);
    map.current.fitToCoordinates(viewport, {
      edgePadding: {
        top: tokens.spacing.md + 1.5 * tokens.touch.minimum + tokens.spacing.xs,
        // Keep the marker's full touch target clear of the right-hand control column.
        right: tokens.spacing["2xl"] + 1.5 * tokens.touch.minimum,
        // Google Maps already adds mapPadding to this command; MapKit's attribution insets do not affect it.
        bottom: 64 + (Platform.OS === "ios" ? bottomInset : 0),
        left: 40,
      },
      animated: false,
    });
  }

  const frameInitialPoints = useEffectEvent(() => fit());
  // Readiness and layout may arrive in either order; later content changes retain the native camera.
  useEffect(() => {
    frameInitialPoints();
  }, [cameraAvailable]);

  /** Lets the native camera own position and scale; no region mirror or tile-state detector is stored. */
  async function zoom(direction: 1 | -1) {
    if (!active) {
      return;
    }
    try {
      const camera = await map.current?.getCamera();
      if (!currentActive.current || !camera || !map.current) {
        return;
      }
      let change;
      if (Platform.OS === "ios" && camera.altitude !== undefined) {
        change = { altitude: camera.altitude / 2 ** direction };
      } else if (Platform.OS === "android" && camera.zoom !== undefined) {
        change = { zoom: camera.zoom + direction };
      } else {
        change = undefined;
      }
      if (!change) {
        return;
      }
      if (reducedMotion) {
        map.current.setCamera(change);
      } else {
        map.current.animateCamera(change);
      }
    } catch {
      if (currentActive.current) {
        feedback.error();
      }
    }
  }

  return (
    <View style={styles.fill}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        userInterfaceStyle={scheme}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        {...mapAttribution}
        toolbarEnabled={false}
        zoomControlEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onMapReady={() => setReady(true)}
        onLayout={({ nativeEvent }) => {
          const { width, height } = nativeEvent.layout;
          if (width > 0 && height > 0) {
            setMapHeight(height);
          }
        }}
        onPress={() => setSelectedId(undefined)}
      >
        {points.map((group) => {
          const first = group.items[0];
          const labels = [
            ...new Set(group.items.map((item) => item.location?.label)),
          ].join(" · ");
          return (
            <Marker
              key={group.key}
              coordinate={group.coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
              centerOffset={{ x: 0, y: 0 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${labels}: ${group.items.map((item) => item.team.team.name).join(", ")}`}
              accessibilityHint="Sélectionner une équipe à cette localisation"
              onPress={(event) => {
                event.stopPropagation();
                setSelectedId(first.team.team.id);
              }}
            >
              <View style={styles.marker}>
                <SportingLogo
                  identity={first.team.team}
                  kind="team"
                  size={tokens.size.control.compact}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>
      <View
        pointerEvents="box-none"
        style={[
          styles.overlay,
          { paddingBottom: bottomInset + tokens.spacing["2xl"] },
        ]}
      >
        <View pointerEvents="box-none" style={styles.mapActions}>
          <View style={controlSurface}>
            <IconButton
              label="Actualiser la carte"
              onPress={onRefresh}
              loading={refreshing}
              disabled={!active}
            >
              <RotateCcw color={colors.icon} size={tokens.size.icon.lg} />
            </IconButton>
          </View>
          <View
            pointerEvents="box-none"
            style={[styles.controls, compactControls && styles.compactControls]}
          >
            <View
              style={[controlSurface, !compactControls && styles.fitControl]}
            >
              <IconButton
                label="Afficher toutes les équipes"
                disabled={cameraActionsDisabled}
                onPress={() => {
                  setSelectedId(undefined);
                  fit();
                }}
              >
                <Image
                  source={require("../../../../assets/sporting/map-fit.svg")}
                  tintColor={colors.icon}
                  style={styles.glyph}
                />
              </IconButton>
            </View>
            <View style={controlSurface}>
              <IconButton
                label="Zoomer"
                disabled={cameraActionsDisabled}
                onPress={() => void zoom(1)}
              >
                <Plus color={colors.icon} size={tokens.size.icon.lg} />
              </IconButton>
            </View>
            <View style={controlSurface}>
              <IconButton
                label="Dézoomer"
                disabled={cameraActionsDisabled}
                onPress={() => void zoom(-1)}
              >
                <Minus color={colors.icon} size={tokens.size.icon.lg} />
              </IconButton>
            </View>
          </View>
        </View>
        {selected && point && (
          <View
            style={[styles.selection, { backgroundColor: colors.surface }]}
            testID="pool-map-selection"
          >
            <View style={styles.selectionToolbar}>
              {point.items.length > 1 && (
                <ScrollView
                  horizontal
                  {...hiddenScrollIndicators}
                  style={styles.optionList}
                  contentContainerStyle={styles.options}
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Équipes à cette localisation"
                >
                  {point.items.map((item) => (
                    <Pressable
                      key={item.team.team.id}
                      accessibilityRole="radio"
                      accessibilityLabel={item.team.team.name}
                      accessibilityState={{
                        checked: item.team.team.id === selectedId,
                      }}
                      onPress={() => setSelectedId(item.team.team.id)}
                      style={[
                        styles.option,
                        {
                          backgroundColor:
                            item.team.team.id === selectedId
                              ? colors.subtle
                              : undefined,
                        },
                      ]}
                    >
                      <SportingLogo
                        identity={item.team.team}
                        kind="team"
                        size={tokens.size.control.compact}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              <IconButton
                label="Fermer"
                onPress={() => setSelectedId(undefined)}
              >
                <X color={colors.icon} size={tokens.size.icon.lg} />
              </IconButton>
            </View>
            <ScrollView
              key={selected.team.team.id}
              {...hiddenScrollIndicators}
              nestedScrollEnabled
              style={styles.summaryViewport}
              contentContainerStyle={styles.summary}
            >
              <ParticipantSummary
                participant={selected}
                active={active}
                recordUnavailable={recordUnavailable}
                record={
                  recordUnavailable
                    ? undefined
                    : publishedMapRecord(standings, selected.team.team.id)
                }
              />
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

/** Keeps exact participant identity/navigation available independently of its optional published record. */
function ParticipantSummary({
  participant,
  active,
  record,
  recordUnavailable,
}: Readonly<{
  recordUnavailable: boolean;
  participant: PoolParticipantResponse;
  active: boolean;
  record: PublishedMapRecord | undefined;
}>) {
  const { colors } = useTheme();
  const sporting = useSportingNavigation(active);
  const identity = participant.team.team;
  return (
    <>
      <Pressable
        accessible
        accessibilityRole="link"
        accessibilityLabel={identity.name}
        onPress={() => void sporting.navigate("team", identity.id)}
        style={({ pressed }) => [
          styles.summaryIdentity,
          { opacity: pressed ? tokens.opacity.pressed : 1 },
        ]}
      >
        <SportingLogo
          identity={identity}
          kind="team"
          size={tokens.size.media.match}
        />
        <Text style={[styles.teamName, { color: colors.text }]}>
          {identity.name}
        </Text>
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.secondaryText}
        />
      </Pressable>
      {recordUnavailable && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Bilan indisponible
        </Text>
      )}
      {record && (
        <View style={styles.record}>
          {record.proportion && <WinLossBar {...record.proportion} />}
          <View style={styles.statistics}>
            {(
              [
                ["Joués", record.played],
                ["Gagnés", record.won],
                ["Perdus", record.lost],
              ] as const
            ).map(([label, value]) => (
              <View
                key={label}
                accessible
                accessibilityLabel={`${label} : ${value ?? "indisponible"}`}
                style={styles.statistic}
              >
                <Text
                  style={[
                    tokens.typography.strong,
                    styles.statisticText,
                    { color: colors.text },
                  ]}
                >
                  {value ?? "—"}
                </Text>
                <Text
                  style={[
                    tokens.typography.metadata,
                    styles.statisticText,
                    { color: colors.secondaryText },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { opacity: 0 },
  overlay: {
    ...StyleSheet.absoluteFill,
    paddingTop: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  marker: {
    width: tokens.touch.minimum,
    height: tokens.touch.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  mapActions: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  controls: {
    gap: tokens.spacing.xs,
  },
  compactControls: { flexDirection: "row" },
  surfaceControl: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
  },
  fitControl: { marginBottom: tokens.spacing.xs },
  glyph: { width: tokens.size.icon.lg, height: tokens.size.icon.lg },
  selection: {
    marginTop: "auto",
    minHeight: 0,
    flexShrink: 1,
    overflow: "hidden",
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  selectionToolbar: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
  },
  optionList: { flex: 1, minWidth: 0 },
  options: { gap: tokens.spacing.sm },
  option: {
    width: tokens.touch.minimum,
    minHeight: tokens.touch.minimum,
    borderRadius: tokens.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryViewport: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  summary: { gap: tokens.spacing.md },
  summaryIdentity: {
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  teamName: { ...tokens.typography.label, flex: 1, minWidth: 0 },
  record: { gap: tokens.spacing.sm },
  statistics: { flexDirection: "row" },
  statistic: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
  },
  statisticText: { flexShrink: 1, textAlign: "center" },
});
