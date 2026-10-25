import { FlatList, StyleSheet, Text, View } from "react-native";
import type {
  SportingIdentityResponse,
  SportingClassificationResponse,
  SportingSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import type { DiscoveryPage } from "../api/discovery-queries";
import { SportingIdentity } from "../../sporting/components/sporting-identity";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Presentation derived from generated summaries; it is never stored beside the Query cache. */
interface SearchResult {
  kind: "club" | "team" | "pool";
  identity: SportingIdentityResponse;
  subtitle?: string;
  classification?: SportingClassificationResponse;
  season?: SportingSeasonResponse;
}

/** Available public context stays absent when the generated summary supplies no corresponding value. */
function results(page: DiscoveryPage): SearchResult[] {
  if ("clubs" in page)
    return page.clubs.map(({ club, city }) => ({
      kind: "club",
      identity: club,
      subtitle: city,
    }));
  if ("teams" in page)
    return page.teams.map(({ team, club, season, classification }) => ({
      kind: "team",
      identity: team,
      subtitle: club?.name,
      season,
      classification,
    }));
  return page.pools.map(
    ({ pool, season, classification, competitionName, phaseName }) => ({
      kind: "pool",
      identity: pool,
      subtitle:
        [competitionName, phaseName].filter(Boolean).join(" · ") || undefined,
      season,
      classification,
    }),
  );
}

/** Initial text-result presentation; complete continuation and activation belong to US4. */
export interface SearchResultsProps {
  pages: readonly DiscoveryPage[];
}

/** Virtualizes public identities using F03 presentation, without claiming a loaded count is a total. */
export function SearchResults({ pages }: SearchResultsProps) {
  const { colors } = useTheme();
  return (
    <FlatList
      data={pages.flatMap(results)}
      keyExtractor={(item) => item.identity.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <Text
          accessibilityRole="header"
          style={[styles.heading, { color: colors.text }]}
        >
          Résultats
        </Text>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <SportingIdentity {...item} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: tokens.spacing.lg,
    paddingTop: 0,
    paddingBottom: tokens.spacing.section,
  },
  heading: {
    ...tokens.typography.navigation,
    paddingVertical: tokens.spacing.md,
  },
  separator: { height: tokens.spacing.md },
});
