import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ChevronRight, Minus, Plus, X } from "lucide-react-native";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
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
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { IconButton } from "../../../shared/components/icon-button";
import { PageContent, PageScrollView } from "../../../shared/components/page";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { EmptyState } from "../../../shared/components/state-card";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useReducedMotion } from "../../../shared/theme/use-reduced-motion";
import { consultationOpeningPolicy } from "../api/consultation-queries";
import { useConsultationQueries } from "../api/use-consultation-queries";
import { useSportingNavigation } from "../navigation";
import { resourceUnavailable } from "../model/consultation-availability";
import {
  publishedMapRecord,
  type PublishedMapRecord,
} from "../model/published-map-record";
import { SportingLogo } from "./sporting-identity";
import { WinLossBar } from "./standing-performance-bar";

/** One pool's participant map; active controls the existing accepted-opening boundary. */
export interface PoolMapProps {
  pool: PoolSummaryResponse;
  active?: boolean;
  /** Ordinary scene identity scrolls before the bounded map or its read state. */
  children?: ReactNode;
}

/** Reads participants and an optional official record independently; native providers own basemap loading. */
export function PoolMap({ pool, active = true, children }: PoolMapProps) {
  const queries = useConsultationQueries();
  const participants = useQuery({
    ...queries.participants(pool.pool.id),
    ...consultationOpeningPolicy,
  });
  const standings = useQuery(queries.standings(pool.pool.id));
  const feedback = useActionFeedback();
  const currentActive = useRef(active);
  useLayoutEffect(() => {
    currentActive.current = active;
  }, [active]);
  const data = participants.data;
  const hasLocations = data?.items.some((item) => item.location) ?? false;

  /** Refetches both existing resources without making optional statistics a condition of the map. */
  async function refresh() {
    if (!active) return;
    feedback.clear();
    const [currentParticipants, currentStandings] = await Promise.all([
      participants.refetch({ cancelRefetch: false }),
      standings.refetch({ cancelRefetch: false }),
    ]);
    if (
      currentActive.current &&
      currentParticipants.data &&
      [currentParticipants, currentStandings].some(
        (result) => result.isError && !resourceUnavailable(result.error),
      )
    )
      feedback.error();
  }

  const refreshControl = data ? (
    <DataRefreshControl
      refreshing={participants.isRefetching || standings.isRefetching}
      onRefresh={() => void refresh()}
      enabled={active}
    />
  ) : undefined;
  if (!data || !hasLocations)
    return (
      <PageScrollView refreshControl={refreshControl}>
        {children && <PageContent>{children}</PageContent>}
        <ScreenState>
          {!data ? (
            <ReadFeedback query={participants} />
          ) : (
            <EmptyState
              title="Aucune localisation disponible"
              description="La localisation des équipes n’est pas renseignée."
            />
          )}
        </ScreenState>
      </PageScrollView>
    );
  return (
    <PageScrollView alwaysBounceVertical refreshControl={refreshControl}>
      <PageContent>
        {children}
        <ParticipantMap
          items={data.items}
          standings={standings.data}
          active={active}
        />
      </PageContent>
    </PageScrollView>
  );
}

/** Exact coordinate equivalence only; every source participant and municipality label is retained. */
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
    if (!item.location) continue;
    const { latitude, longitude } = item.location;
    const key = `${latitude}:${longitude}`;
    const existing = groups.get(key);
    if (existing) existing.items.push(item);
    else
      groups.set(key, {
        key,
        coordinate: { latitude, longitude },
        items: [item],
      });
  }
  return [...groups.values()];
}

/** Owns only map interaction; selected data is derived from the latest admitted participants. */
function ParticipantMap({
  items,
  standings,
  active,
}: {
  active: boolean;
  items: PoolParticipantResponse[];
  standings: PoolStandingsResponse | undefined;
}) {
  const { colors, scheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const feedback = useActionFeedback();
  const currentActive = useRef(active);
  useLayoutEffect(() => {
    currentActive.current = active;
  }, [active]);
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const cameraAvailable = ready && laidOut;
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
    if (!cameraAvailable || !map.current || !points.length) return;
    const coordinate = points[0].coordinate;
    // A lone marker keeps a municipal viewport envelope; these camera bounds create no markers.
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
        top: 64,
        right: 64,
        bottom: 64,
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
    if (!active) return;
    try {
      const camera = await map.current?.getCamera();
      if (!currentActive.current || !camera || !map.current) return;
      const change =
        Platform.OS === "ios" && camera.altitude !== undefined
          ? { altitude: camera.altitude / 2 ** direction }
          : Platform.OS === "android" && camera.zoom !== undefined
            ? { zoom: camera.zoom + direction }
            : undefined;
      if (!change) return;
      if (reducedMotion) map.current.setCamera(change);
      else map.current.animateCamera(change);
    } catch {
      if (currentActive.current) feedback.error();
    }
  }

  return (
    <View style={[styles.map, { borderColor: colors.border }]}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        userInterfaceStyle={scheme}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        zoomControlEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onMapReady={() => setReady(true)}
        onLayout={({ nativeEvent }) => {
          const { width, height } = nativeEvent.layout;
          setLaidOut(width > 0 && height > 0);
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
              accessibilityHint="Sélectionner une équipe à cette commune"
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
      <View pointerEvents="box-none" style={styles.overlay}>
        <View pointerEvents="box-none" style={styles.controls}>
          <View
            style={[
              styles.surfaceControl,
              styles.fitControl,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <IconButton
              label="Afficher toutes les équipes"
              disabled={!cameraAvailable}
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
          <View
            style={[
              styles.surfaceControl,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <IconButton
              label="Zoomer"
              disabled={!cameraAvailable}
              onPress={() => void zoom(1)}
            >
              <Plus color={colors.icon} size={tokens.size.icon.lg} />
            </IconButton>
          </View>
          <View
            style={[
              styles.surfaceControl,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <IconButton
              label="Dézoomer"
              disabled={!cameraAvailable}
              onPress={() => void zoom(-1)}
            >
              <Minus color={colors.icon} size={tokens.size.icon.lg} />
            </IconButton>
          </View>
        </View>
        {selected && point && (
          <View
            style={[styles.selection, { backgroundColor: colors.surface }]}
            testID="pool-map-selection"
          >
            <View style={styles.selectionToolbar}>
              <ScrollView
                horizontal
                {...hiddenScrollIndicators}
                style={styles.optionList}
                contentContainerStyle={styles.options}
                accessibilityRole="radiogroup"
                accessibilityLabel="Équipes à cette commune"
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
                record={publishedMapRecord(standings, selected.team.team.id)}
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
}: {
  participant: PoolParticipantResponse;
  active: boolean;
  record: PublishedMapRecord | undefined;
}) {
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
  map: {
    height: 440,
    borderRadius: tokens.radius.panel,
    borderWidth: tokens.border.thin,
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    paddingTop: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing["2xl"],
    gap: tokens.spacing.sm,
  },
  marker: {
    width: tokens.touch.minimum,
    height: tokens.touch.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    flexShrink: 0,
    alignSelf: "flex-end",
    gap: tokens.spacing.xs,
  },
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
