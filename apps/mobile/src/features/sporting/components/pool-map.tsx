import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Minus, Plus, X } from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useId,
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
import { Button } from "../../../shared/components/button";
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
import { SportingLogo } from "./sporting-identity";

/** One pool's participant map; active controls the existing accepted-opening boundary. */
export interface PoolMapProps {
  pool: PoolSummaryResponse;
  active?: boolean;
  /** Ordinary scene identity scrolls before the bounded map or its read state. */
  children?: ReactNode;
}

/** Reads independent participants; native providers alone own basemap loading and failure presentation. */
export function PoolMap({ pool, active = true, children }: PoolMapProps) {
  const queries = useConsultationQueries();
  const participants = useQuery({
    ...queries.participants(pool.pool.id),
    ...consultationOpeningPolicy,
  });
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const currentActive = useRef(active);
  useLayoutEffect(() => {
    currentActive.current = active;
  }, [active]);
  const data = participants.data;
  const located = data?.items.filter((item) => item.location).length ?? 0;
  const total = data?.items.length ?? 0;
  const count = `${total} équipe${total === 1 ? "" : "s"}`;

  /** Refreshes only participants; an ordinary failed read retains the existing authorized map. */
  async function refresh() {
    if (!active) return;
    feedback.clear();
    const result = await participants.refetch({ cancelRefetch: false });
    if (currentActive.current && result.isError && result.data)
      feedback.error();
  }

  const refreshControl = data ? (
    <DataRefreshControl
      refreshing={participants.isRefetching}
      onRefresh={() => void refresh()}
      enabled={active}
    />
  ) : undefined;
  if (!data || located === 0)
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
      </PageScrollView>
    );
  return (
    <PageScrollView alwaysBounceVertical refreshControl={refreshControl}>
      <PageContent>
        {children}
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
  pool,
  items,
  active,
  coverage,
}: PoolMapProps & {
  active: boolean;
  items: PoolParticipantResponse[];
  coverage: string;
}) {
  const { colors, scheme } = useTheme();
  const gradientId = useId();
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
  const [selectionHeight, setSelectionHeight] = useState(0);
  const [identityHeight, setIdentityHeight] = useState(0);
  const points = useMemo(() => participantPoints(items), [items]);
  const point = points.find((group) =>
    group.items.some((item) => item.team.team.id === selectedId),
  );
  const selected = point?.items.find(
    (item) => item.team.team.id === selectedId,
  );
  const selectionVisible = !!selected;

  /** Uses supported native framing; a lone municipality never starts at building-level zoom. */
  const fit = useCallback(() => {
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
        top: identityHeight + tokens.spacing["2xl"],
        right: 64,
        bottom: selectionVisible ? selectionHeight + 48 : 64,
        left: 40,
      },
      animated: false,
    });
  }, [
    cameraAvailable,
    identityHeight,
    points,
    selectionHeight,
    selectionVisible,
  ]);
  // Readiness and layout may arrive in either order; neither is proof of loaded tiles.
  useEffect(() => {
    fit();
  }, [fit]);

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
      <View pointerEvents="box-none">
        <View
          pointerEvents="none"
          style={styles.identity}
          testID="pool-map-identity"
          onLayout={({ nativeEvent }) =>
            setIdentityHeight(nativeEvent.layout.height)
          }
        >
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
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
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
      </View>
      {selected && point && (
        <View
          style={[styles.selection, { backgroundColor: colors.surface }]}
          testID="pool-map-selection"
          onLayout={({ nativeEvent }) =>
            setSelectionHeight(nativeEvent.layout.height)
          }
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
            <IconButton label="Fermer" onPress={() => setSelectedId(undefined)}>
              <X color={colors.icon} size={tokens.size.icon.lg} />
            </IconButton>
          </View>
          <View style={styles.summary}>
            <ParticipantSummary
              key={selected.team.team.id}
              participant={selected}
              active={active}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/** Identifies the exact participant and opens its team; statistics remain on their own journey. */
function ParticipantSummary({
  participant,
  active,
}: {
  participant: PoolParticipantResponse;
  active: boolean;
}) {
  const { colors } = useTheme();
  const sporting = useSportingNavigation(active);
  const identity = participant.team.team;
  return (
    <>
      <View style={styles.summaryIdentity}>
        <SportingLogo
          identity={identity}
          kind="team"
          size={tokens.size.media.match}
        />
        <Text style={[styles.teamName, { color: colors.text }]}>
          {identity.name}
        </Text>
      </View>
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
    height: 440,
    borderRadius: tokens.radius.panel,
    borderWidth: tokens.border.thin,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  identity: {
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
    top: 77,
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
    marginTop: tokens.spacing.md,
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing["2xl"],
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  selectionToolbar: {
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
  summary: { gap: tokens.spacing.md },
  summaryIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  teamName: { ...tokens.typography.label, flex: 1 },
});
