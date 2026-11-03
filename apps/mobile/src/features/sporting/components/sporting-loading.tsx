import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { IdentityCardSkeleton } from "../../../shared/components/identity-card-loading";
import { EntryRowSkeleton } from "../../../shared/components/list-loading";
import { EntryGroup } from "../../../shared/components/entry-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { Surface } from "../../../shared/components/surface";
import { tokens } from "../../../shared/theme/tokens";
import { CalendarSkeleton } from "./calendar-loading";
import { StandingsSkeleton } from "./standings-loading";

/** Team initial reads reserve their shared identity and dated content without starting a neighboring query. */
export function SportingCalendarPageLoading({ label }: { label: string }) {
  return (
    <LoadingGroup label={label} style={styles.body}>
      <IdentityCardSkeleton />
      <CalendarSkeleton />
    </LoadingGroup>
  );
}

/** A pool opens its standings tab; identity and the complete row block share one read announcement. */
export function SportingPoolLoading() {
  return (
    <LoadingGroup label="Chargement de la poule" style={styles.body}>
      <IdentityCardSkeleton />
      <StandingsSkeleton layout="list" />
    </LoadingGroup>
  );
}

/** A club initially opens its information tab, retaining the common identity and basic information rows. */
export function SportingClubLoading() {
  return (
    <LoadingGroup label="Chargement du club" style={styles.body}>
      <IdentityCardSkeleton />
      <EntryGroup>
        <EntryRowSkeleton />
        <EntryRowSkeleton />
        <EntryRowSkeleton />
      </EntryGroup>
    </LoadingGroup>
  );
}

/** Match detail keeps its pool heading and two ordered teams above its unavailable information sections. */
export function SportingMatchLoading() {
  return (
    <LoadingGroup label="Chargement du match" style={styles.body}>
      <Surface>
        <View style={styles.body}>
          <Skeleton width="65%" height={tokens.typography.title.lineHeight} />
          <View style={styles.team}>
            <Skeleton
              width={tokens.size.media.match}
              height={tokens.size.media.match}
            />
            <View style={styles.copy}>
              <Skeleton width="85%" />
            </View>
          </View>
          <View style={styles.team}>
            <Skeleton
              width={tokens.size.media.match}
              height={tokens.size.media.match}
            />
            <View style={styles.copy}>
              <Skeleton width="85%" />
            </View>
          </View>
        </View>
      </Surface>
      <EntryGroup>
        <EntryRowSkeleton />
        <EntryRowSkeleton />
        <EntryRowSkeleton />
      </EntryGroup>
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  body: { gap: tokens.spacing.lg },
  team: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    minHeight: tokens.sporting.teamMinHeight,
  },
  copy: { flex: 1, minWidth: 0 },
});
