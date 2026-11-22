import { PageScrollView, PageContent } from "@/shared/components/page";
import { standingVisibleColumns } from "../model/standing-columns";
import { useQuery } from "@tanstack/react-query";
import { divisionTextColor } from "../presentation";
import { Columns3, List } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { useSingleContentReveal } from "@/shared/components/content-reveal";
import { ReloadButton } from "@/shared/components/reload-button";
import { SelectionIndicator } from "@/shared/components/selection-indicator";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { EmptyState } from "@/shared/components/state-card";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useConsultationQueries } from "../api/use-consultation-queries";
import { StandingTable, type StandingLayout } from "./standing-table";
import { StandingsLoading } from "./standings-loading";

const layoutSize = tokens.size.control.compact;
const layoutInset = (tokens.touch.minimum - layoutSize) / 2;
const layoutStep = tokens.touch.minimum + tokens.spacing.xs;
const layoutTransition = {
  duration: tokens.motion.compact.duration,
  easing: Easing.bezier(...tokens.motion.compact.easing),
  reduceMotion: ReduceMotion.Never,
};

/** One exact pool's independently retained table; team emphasis uses identity alone, never rank. */
export interface PoolStandingsProps {
  poolId: string;
  divisionColor: string | undefined;
  highlightTeamId?: string;
  /** Retained inactive panels cannot refresh or release an old sporting opening. */
  active?: boolean;
  /** Optional exact pool entry shares the compact row with the layout controls. */
  children?: ReactNode;
  /** Team participation Empty retains its refresh action; the approved Pool pane has no such action. */
  refreshEmpty?: boolean;
}

/** Retains each table's layout and Query data while failures replace only its dependent pane. */
export function PoolStandings({
  poolId,
  divisionColor,
  highlightTeamId,
  active = true,
  children,
  refreshEmpty = true,
}: Readonly<PoolStandingsProps>) {
  const queries = useConsultationQueries();
  const standings = useQuery(queries.standings(poolId));
  const { colors, reducedMotion } = useTheme();
  const [layout, setLayout] = useState<StandingLayout>("list");
  const data = standings.data;
  const columns = standingVisibleColumns(data?.columns ?? []);
  const selectedFill = divisionColor ?? colors.subtle;
  const selectedIcon = divisionColor
    ? divisionTextColor(divisionColor)
    : colors.icon;
  const layoutTarget = layout === "list" ? 1 : 0;
  const layoutProgress = useDerivedValue(() =>
    reducedMotion ? layoutTarget : withTiming(layoutTarget, layoutTransition),
  );
  const indicatorPosition = useAnimatedStyle(() => ({
    left: layoutInset + layoutProgress.value * layoutStep,
  }));
  const cardsInk = useAnimatedStyle(() => ({
    opacity: 1 - layoutProgress.value,
  }));
  const listInk = useAnimatedStyle(() => ({ opacity: layoutProgress.value }));

  /** Joins or starts this table's safe read; Query owns retries, suspension and its result. */
  async function refresh() {
    if (active) {
      await standings.refetch({ cancelRefetch: false });
    }
  }

  const hasRows = data?.availability === "available" && data.rows.length > 0;
  const failed =
    hasReadError(standings) || data?.availability === "unavailable";
  const revealStyle = useSingleContentReveal(
    active && data !== undefined && !failed,
  );

  const headerRow = (
    <View style={styles.headerRow}>
      {children && <View style={styles.participation}>{children}</View>}
      <View
        style={styles.toolbar}
        accessibilityRole="radiogroup"
        accessibilityLabel="Présentation du classement"
      >
        <SelectionIndicator
          style={[styles.layoutIndicator, indicatorPosition]}
          fill={selectedFill}
          radius={tokens.radius.control}
        />
        {(
          [
            ["cards", "Afficher en cartes", Columns3],
            ["list", "Afficher en liste", List],
          ] as const
        ).map(([value, label, Icon]) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: layout === value }}
            onPress={() => setLayout(value)}
            style={styles.layoutAction}
          >
            <Icon
              accessible={false}
              size={tokens.size.icon.md}
              color={colors.icon}
            />
            {selectedIcon !== colors.icon && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.layoutInk,
                  value === "cards" ? cardsInk : listInk,
                ]}
              >
                <Icon
                  accessible={false}
                  size={tokens.size.icon.md}
                  color={selectedIcon}
                />
              </Animated.View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
  if (failed) {
    return (
      <PageScrollView>
        <ScreenState>
          <ReadFeedback
            query={standings}
            failed
            onRetry={refresh}
            loadingContent={null}
          />
        </ScreenState>
      </PageScrollView>
    );
  }
  if (!hasRows) {
    return (
      <PageScrollView>
        {standings.isLoading ? (
          <PageContent style={styles.content}>
            <View style={styles.standings}>
              {headerRow}
              <StandingsLoading layout={layout} />
            </View>
          </PageContent>
        ) : (
          <>
            {children && (
              <PageContent style={styles.stateControls}>{children}</PageContent>
            )}
            <ScreenState>
              {data ? (
                <Animated.View style={[styles.emptyBlock, revealStyle]}>
                  <EmptyState
                    title={
                      data.availability === "not-published"
                        ? "Pas de classement pour cette phase"
                        : "Aucune équipe dans ce classement"
                    }
                  >
                    {refreshEmpty && (
                      <ReloadButton
                        fetching={standings.isFetching}
                        onReload={refresh}
                        disabled={!active}
                      />
                    )}
                  </EmptyState>
                </Animated.View>
              ) : null}
            </ScreenState>
          </>
        )}
      </PageScrollView>
    );
  }
  return (
    <PageScrollView
      alwaysBounceVertical
      refreshControl={
        <DataRefreshControl
          onRefresh={refresh}
          enabled={active}
          fetching={standings.isFetching}
        />
      }
    >
      <PageContent style={styles.content}>
        <View style={styles.standings}>
          {headerRow}
          <StandingTable
            style={revealStyle}
            rows={data.rows}
            columns={columns}
            layout={layout}
            active={active}
            highlightTeamId={highlightTeamId}
            divisionColor={divisionColor}
          />
        </View>
      </PageContent>
    </PageScrollView>
  );
}

const styles = StyleSheet.create({
  emptyBlock: { width: "100%" },
  stateControls: { paddingBottom: 0 },
  content: { paddingTop: tokens.spacing.lg },
  standings: { gap: tokens.spacing.lg },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
  },
  participation: { flex: 1, minWidth: 0 },
  toolbar: {
    flexShrink: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing.xs,
  },
  layoutAction: {
    width: tokens.touch.minimum,
    height: tokens.touch.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  layoutInk: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  layoutIndicator: { top: layoutInset, width: layoutSize, height: layoutSize },
});
