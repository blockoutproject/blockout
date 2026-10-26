import {
  genderLabel,
  formatLabel,
} from "../../sporting/classification-presentation";
import type { SearchResult } from "../model/search-result";
import { divisionTextColor } from "../../sporting/presentation";
import { DivisionPaint } from "../../sporting/components/division-paint";
import {
  SportingMedia,
  SportingCover,
} from "../../sporting/components/sporting-media";
import { hashKey, useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import type { SportingIdentityResponse } from "../../../../.generated/schemas/index.zod";
import { useConsultationQueries } from "../../sporting/api/use-consultation-queries";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Entity Card metadata uses a 24-point badge minimum; its loading representation shares this owner. */
export const resultBadgeSize = 24;

/** Product Design Entity Card 354:565; activation and its disclosure remain with US4. */
export function SearchResultCard({
  kind,
  identity,
  city,
  subtitle,
  classification,
  season,
}: SearchResult) {
  const { colors } = useTheme();
  const division = classification?.division;
  const foreground = division ? divisionTextColor(division.color) : colors.text;
  const metadata = [
    { id: "city", label: city },
    { id: "division", label: division?.name },
    { id: "season", label: season?.label },
    { id: "format", label: formatLabel(classification?.format) },
    {
      id: "gender",
      label: genderLabel(classification?.gender),
    },
  ].filter(({ label }) => label !== undefined);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
        },
      ]}
    >
      <View style={styles.identity}>
        <DivisionPaint division={division} />
        {division?.logoUrl && (
          <ResultArtwork
            identity={division}
            kind="division"
            backgroundColor={division.color}
          />
        )}
        {kind === "pool" ? (
          division ? (
            <ResultArtwork identity={division} kind="division" />
          ) : (
            <SportingMedia
              identity={identity}
              kind="division"
              size={tokens.size.media.entity}
              presentation="entity"
            />
          )
        ) : (
          <ResultArtwork identity={identity} kind={kind} />
        )}
        <View style={styles.name}>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.navigation, { color: foreground }]}
          >
            {identity.name}
          </Text>
          {subtitle && (
            <Text style={[tokens.typography.metadata, { color: foreground }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {metadata.length > 0 && (
        <View style={styles.metadata}>
          {metadata.map(({ id, label }) => (
            <View
              key={id}
              style={[
                styles.badge,
                {
                  backgroundColor:
                    id === "division" ? division?.color : colors.subtle,
                  borderColor:
                    id === "division" ? division?.color : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeLabel,
                  {
                    color:
                      id === "division" ? foreground : colors.secondaryText,
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View
        pointerEvents="none"
        accessible={false}
        style={[
          StyleSheet.absoluteFill,
          styles.edge,
          {
            borderColor: division
              ? `${division.color}${tokens.sporting.borderAlpha}`
              : colors.border,
          },
        ]}
      />
    </View>
  );
}

/** F03 artwork/admission stays authoritative; search inherits F13's no-replay Query defaults. */
function ResultArtwork({
  identity,
  kind,
  backgroundColor,
}: {
  identity: SportingIdentityResponse;
  kind: "club" | "team" | "division";
  backgroundColor?: string;
}) {
  const queries = useConsultationQueries();
  const options =
    kind === "club"
      ? queries.clubLogo(identity.id)
      : kind === "team"
        ? queries.teamLogo(identity.id)
        : queries.divisionLogo(identity.id);
  const query = useQuery({ ...options, enabled: !!identity.logoUrl });
  if (backgroundColor)
    return identity.logoUrl && query.data ? (
      <SportingCover
        key={`${hashKey(options.queryKey)}:${query.dataUpdatedAt}`}
        uri={query.data}
        primary={backgroundColor}
      />
    ) : null;
  return (
    <SportingMedia
      key={`${hashKey(options.queryKey)}:${query.dataUpdatedAt}`}
      identity={identity}
      kind={kind}
      size={tokens.size.media.entity}
      presentation="entity"
      uri={identity.logoUrl ? query.data : undefined}
      loading={!!identity.logoUrl && query.isPending}
      error={!!identity.logoUrl && query.isError}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  // Figma's inside stroke overlays the content without changing the header or classification geometry.
  edge: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.md,
    overflow: "hidden",
  },
  name: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.tight,
  },
  badge: {
    minHeight: resultBadgeSize,
    justifyContent: "center",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.xs - tokens.border.thin,
    paddingHorizontal: tokens.spacing.sm,
    flexShrink: 1,
  },
  badgeLabel: tokens.typography.metadata,
});
