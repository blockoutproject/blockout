import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Minus, Plus, X } from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useId,
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
import {
  TabScrollView,
  useCollapsingTabsContext,
} from "react-native-collapsible-tab";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type LatLng,
} from "react-native-maps";
import type {
  PoolParticipantResponse,
  PoolSummaryResponse,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { IconButton } from "../../../shared/components/icon-button";
import { PageContent } from "../../../shared/components/page";
import { PagedStateScrollView } from "../../../shared/components/paged-tabs";
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
import { SportingLogo } from "./sporting-identity";

/** One pool's participant map; active controls the existing accepted-opening boundary. */
export interface PoolMapProps {
  pool: PoolSummaryResponse;
  active?: boolean;
}

/** Reads independent participants; native providers alone own basemap loading and failure presentation. */
export function PoolMap({ pool, active = true }: PoolMapProps) {
  const queries = useConsultationQueries();
  const participants = useQuery({
    ...queries.participants(pool.pool.id),
    ...consultationOpeningPolicy,
  });
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const data = participants.data;
  const located = data?.items.filter((item) => item.location).length ?? 0;
  const total = data?.items.length ?? 0;
  const count = `${total} équipe${total === 1 ? "" : "s"}`;

  /** Refreshes only participants; an ordinary failed read retains the existing authorized map. */
  async function refresh() {
    feedback.clear();
    const result = await participants.refetch({ cancelRefetch: false });
    if (result.isError && result.data) feedback.error();
  }

  const refreshControl = data ? (
    <DataRefreshControl
      refreshing={participants.isRefetching}
      onRefresh={() => void refresh()}
    />
  ) : undefined;
  if (!data || located === 0)
    return (
      <PagedStateScrollView refreshControl={refreshControl}>
        <ScreenState>
          {!data ? (
            <ReadFeedback query={participants} />
          ) : (
            <EmptyState
              title="Aucune localisation disponible"
              description="La localisation des équipes n’est pas renseignée."
            >
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                {count}
              </Text>
            </EmptyState>
          )}
        </ScreenState>
      </PagedStateScrollView>
    );
  return (
    <TabScrollView
      {...hiddenScrollIndicators}
      alwaysBounceVertical
      refreshControl={refreshControl}
    >
      <PageContent>
        <ParticipantMap
          pool={pool}
          items={data.items}
          active={active}
          coverage={
            located === total
              ? count
              : `${count}, dont ${located} localisée${located === 1 ? "" : "s"}`
          }
        />
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Localisation à la commune, pas au gymnase.
        </Text>
      </PageContent>
      <BottomContentSpacer />
    </TabScrollView>
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
  pool,
  items,
  active,
  coverage,
}: PoolMapProps & {
  items: PoolParticipantResponse[];
  coverage: string;
}) {
  const { colors, scheme } = useTheme();
  const { containerHeight, paddingTop } = useCollapsingTabsContext();
  const gradientId = useId();
  const reducedMotion = useReducedMotion();
  const feedback = useActionFeedback();
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
  // RNCT owns chrome measurements; keep the map and selected action in the available initial viewport.
  const mapHeight = Math.min(
    583,
    Math.max(360, containerHeight - paddingTop - 64),
  );
  const selectionHeight = Math.max(
    120,
    mapHeight - 78 - 3 * tokens.touch.minimum - 4 * tokens.spacing.md,
  );
  const selectionVisible = !!selected;

  /** Uses supported native framing; a lone municipality never starts at building-level zoom. */
  const fit = useCallback(() => {
    if (!cameraAvailable || !map.current || !points.length) return;
    if (points.length === 1) {
      map.current.animateToRegion(
        { ...points[0].coordinate, latitudeDelta: 0.15, longitudeDelta: 0.15 },
        0,
      );
    } else {
      map.current.fitToCoordinates(
        points.map((group) => group.coordinate),
        {
          edgePadding: {
            top: 100,
            right: 64,
            bottom: selectionVisible ? selectionHeight + 48 : 64,
            left: 40,
          },
          animated: false,
        },
      );
    }
  }, [cameraAvailable, points, selectionHeight, selectionVisible]);
  // Readiness and layout may arrive in either order; neither is proof of loaded tiles.
  useEffect(() => {
    fit();
  }, [fit]);

  /** Lets the native camera own position and scale; no region mirror or tile-state detector is stored. */
  async function zoom(direction: 1 | -1) {
    try {
      const camera = await map.current?.getCamera();
      if (!camera || !map.current) return;
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
      feedback.error();
    }
  }

  return (
    <View
      style={[styles.map, { height: mapHeight, borderColor: colors.border }]}
    >
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
      <View pointerEvents="none" style={styles.identity}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.surface} />
              <Stop offset="1" stopColor={colors.surface} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
        <Text style={[tokens.typography.headingSm, { color: colors.text }]}>
          {pool.pool.name}
        </Text>
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          {coverage}
        </Text>
      </View>
      <View style={styles.controls}>
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
          style={[
            styles.selection,
            { maxHeight: selectionHeight, backgroundColor: colors.surface },
          ]}
        >
          <View style={styles.selectionToolbar}>
            <ScrollView
              horizontal
              {...hiddenScrollIndicators}
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
            <IconButton label="Fermer" onPress={() => setSelectedId(undefined)}>
              <X color={colors.icon} size={tokens.size.icon.lg} />
            </IconButton>
          </View>
          <ScrollView
            {...hiddenScrollIndicators}
            contentContainerStyle={styles.summary}
            nestedScrollEnabled
          >
            <ParticipantSummary
              participant={selected}
              poolId={pool.pool.id}
              active={active ?? true}
            />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/** Optional official statistics enrich the exact selection without owning its identity or availability. */
function ParticipantSummary({
  participant,
  poolId,
  active,
}: {
  participant: PoolParticipantResponse;
  poolId: string;
  active: boolean;
}) {
  const queries = useConsultationQueries();
  const standings = useQuery({
    ...queries.standings(poolId),
    refetchOnMount: false,
  });
  const { colors } = useTheme();
  const sporting = useSportingNavigation(active);
  const identity = participant.team.team;
  const row =
    standings.data?.availability === "available"
      ? standings.data.rows.find((entry) => entry.team?.id === identity.id)
      : undefined;
  const columns = row ? (standings.data?.columns ?? []) : [];
  const trailing = columns.at(-1);
  return (
    <>
      <View style={[styles.summaryIdentity, { borderColor: colors.border }]}>
        {row?.position !== undefined && (
          <Text
            accessibilityLabel={`Rang ${row.position}`}
            style={[
              styles.rank,
              { color: colors.text, backgroundColor: colors.rank.neutral },
            ]}
          >
            {row.position}
          </Text>
        )}
        <SportingLogo
          identity={identity}
          kind="team"
          size={tokens.size.media.match}
        />
        <Text style={[styles.teamName, { color: colors.text }]}>
          {identity.name}
        </Text>
        {row && trailing && (
          <View style={styles.points}>
            <Text style={[tokens.typography.headingLg, { color: colors.text }]}>
              {row.statistics[trailing] ?? "—"}
            </Text>
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              {trailing}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        {participant.location?.label}
      </Text>
      {row && columns.length > 1 && (
        <View style={styles.statistics}>
          {columns.slice(0, -1).map((column) => (
            <View key={column} style={styles.statistic}>
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                {column}
              </Text>
              <Text
                style={[tokens.typography.headingSm, { color: colors.text }]}
              >
                {row.statistics[column] ?? "—"}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Button
        label="Voir l’équipe"
        accessibilityRole="link"
        variant="inverse"
        fullWidth
        onPress={() => void sporting.navigate("team", identity.id)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  map: {
    borderRadius: tokens.radius.panel,
    borderWidth: tokens.border.thin,
    overflow: "hidden",
  },
  identity: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.xs,
  },
  marker: {
    width: tokens.touch.minimum,
    height: tokens.touch.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    position: "absolute",
    top: 78,
    right: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  surfaceControl: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
  },
  fitControl: { marginBottom: tokens.spacing.xs },
  glyph: { width: tokens.size.icon.lg, height: tokens.size.icon.lg },
  selection: {
    position: "absolute",
    left: tokens.spacing.md,
    right: tokens.spacing.md,
    bottom: tokens.spacing["2xl"],
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  selectionToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  options: { gap: tokens.spacing.sm },
  option: {
    width: tokens.touch.minimum,
    height: tokens.touch.minimum,
    borderRadius: tokens.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: { gap: tokens.spacing.md },
  summaryIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    borderTopWidth: tokens.border.thin,
    paddingTop: tokens.spacing.md,
  },
  rank: {
    ...tokens.typography.headingSm,
    minWidth: tokens.sporting.standingsRankWidth,
    minHeight: tokens.sporting.standingsRankHeight,
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: tokens.radius.sm,
  },
  teamName: { ...tokens.typography.strong, flex: 1 },
  points: { alignItems: "flex-end" },
  statistics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.md,
  },
  statistic: { alignItems: "center", flexGrow: 1 },
});
