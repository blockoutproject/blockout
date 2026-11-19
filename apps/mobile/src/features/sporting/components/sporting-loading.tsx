import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "@/shared/components/loading-group";
import { IdentityCardSkeleton } from "@/shared/components/identity-card-loading";
import { EntryGroupSeparator } from "@/shared/components/entry-group";
import { Surface } from "@/shared/components/surface";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { tokens } from "@/shared/theme/tokens";
import { ContactLinkSkeleton } from "./contact-link";
import { StandingsSkeleton } from "./standings-loading";
import { CalendarSkeleton } from "./calendar-loading";

/** One initial announcement combines the team's identity with its first applicable content. */
export function SportingTeamLoading({
  calendar = false,
}: Readonly<{ calendar?: boolean }>) {
  return (
    <LoadingGroup label="Chargement de l’équipe" style={styles.body}>
      <IdentityCardSkeleton />
      {calendar ? <CalendarSkeleton /> : <StandingsSkeleton />}
    </LoadingGroup>
  );
}

/** A pool opens its standings tab; identity and the row block share one read announcement. */
export function SportingPoolLoading() {
  return (
    <LoadingGroup label="Chargement de la poule" style={styles.body}>
      <IdentityCardSkeleton />
      <StandingsSkeleton />
    </LoadingGroup>
  );
}

/** A club's initial information tab retains its identity and basic information rows. */
export function SportingClubLoading() {
  return (
    <LoadingGroup label="Chargement du club" style={styles.body}>
      <IdentityCardSkeleton club />
      <View style={styles.information}>
        <TextSkeleton role="navigation" width="40%" />
        <Surface style={styles.contacts}>
          <ContactLinkSkeleton />
          <View style={styles.divider}>
            <EntryGroupSeparator />
          </View>
          <ContactLinkSkeleton />
          <View style={styles.divider}>
            <EntryGroupSeparator />
          </View>
          <ContactLinkSkeleton />
        </Surface>
      </View>
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  body: { gap: tokens.spacing.lg },
  information: { gap: tokens.spacing.md },
  contacts: { padding: 0, gap: 0 },
  divider: { marginHorizontal: tokens.spacing.md },
});
