import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type {
  SportingIdentityResponse,
  SportingClassificationResponse,
  SportingSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import type { DiscoveryPage } from "../api/discovery-queries";
import { useConsultationQueries } from "../../sporting/api/use-consultation-queries";
import { binaryImagePreview } from "../../../shared/api/binary-image-preview";
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

/** Virtualizes public summaries without claiming a loaded count is a total or activating destinations. */
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
      renderItem={({ item }) => <ResultSummary result={item} />}
    />
  );
}

/** Search summaries retain current public context; F03's full-page mount refresh does not apply here. */
function ResultSummary({ result }: { result: SearchResult }) {
  const { colors } = useTheme();
  const { identity, kind, subtitle, classification, season } = result;
  const metadata = [
    classification?.division?.name,
    season?.label,
    classification?.format?.replace("x", " × "),
    classification?.gender === "female"
      ? "Féminin"
      : classification?.gender === "male"
        ? "Masculin"
        : classification?.gender === "mixed"
          ? "Mixte"
          : undefined,
  ].filter((value) => value !== undefined);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: classification?.division?.color ?? colors.border,
        },
      ]}
    >
      <View style={[styles.identity, { backgroundColor: colors.subtle }]}>
        {identity.logoUrl && kind !== "pool" && (
          <ResultLogo identity={identity} kind={kind} />
        )}
        {kind === "pool" && classification?.division?.logoUrl && (
          <ResultLogo identity={classification.division} kind="division" />
        )}
        <View style={styles.name}>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.text }]}
          >
            {identity.name}
          </Text>
          {subtitle && (
            <Text style={[styles.secondary, { color: colors.secondaryText }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {metadata.length > 0 && (
        <View style={styles.metadata}>
          {metadata.map((label) => (
            <Text
              key={label}
              style={[
                styles.badge,
                { color: colors.secondaryText, borderColor: colors.border },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/** Uses F03's generated artwork/admission options with F13's ordinary no-replay lifecycle. */
function ResultLogo({
  identity,
  kind,
}: {
  identity: SportingIdentityResponse;
  kind: "club" | "team" | "division";
}) {
  const queries = useConsultationQueries();
  const options =
    kind === "club"
      ? queries.clubLogo(identity.id)
      : kind === "team"
        ? queries.teamLogo(identity.id)
        : queries.divisionLogo(identity.id);
  const query = useQuery(options);
  const { colors } = useTheme();
  return (
    <View style={styles.logo}>
      {query.data ? (
        <LogoPreview key={JSON.stringify(options.queryKey)} blob={query.data} />
      ) : (
        <Text style={[styles.secondary, { color: colors.secondaryText }]}>
          {query.isError ? "Logo indisponible" : "Chargement du logo"}
        </Text>
      )}
    </View>
  );
}

/** Retains a decoded same-identity image during conversion; obsolete completions cannot replace it. */
function LogoPreview({ blob }: { blob: Blob }) {
  const [uri, setUri] = useState<string>();
  const [failed, setFailed] = useState(false);
  const { colors } = useTheme();
  useEffect(() => {
    let current = true;
    void binaryImagePreview(blob).then(
      (value) => {
        if (current) {
          setUri(value);
          setFailed(false);
        }
      },
      () => {
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [blob]);
  return failed ? (
    <Text style={[styles.secondary, { color: colors.secondaryText }]}>
      Logo indisponible
    </Text>
  ) : uri ? (
    <Image
      source={{ uri }}
      accessible={false}
      cachePolicy="none"
      contentFit="contain"
      onError={() => setFailed(true)}
      style={styles.logoImage}
    />
  ) : null;
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
  card: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    overflow: "hidden",
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  name: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  secondary: { ...tokens.typography.metadata },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  badge: {
    ...tokens.typography.metadata,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.badge,
    padding: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  logo: {
    width: tokens.size.control,
    minHeight: tokens.size.control,
    justifyContent: "center",
  },
  logoImage: { width: tokens.size.control, height: tokens.size.control },
});
