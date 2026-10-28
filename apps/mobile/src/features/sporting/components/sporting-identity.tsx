import { genderLabel, formatLabel } from "../classification-presentation";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  SportingIdentityResponse,
  SportingClassificationResponse,
  SportingSeasonResponse,
  SportingDivisionResponse,
} from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { consultationOpeningPolicy } from "../api/consultation-queries";
import { useConsultationQueries } from "../api/use-consultation-queries";
import { SportingMedia, SportingCover } from "./sporting-media";
import { DivisionPaint } from "./division-paint";

/** Addressed public identity; artwork reads use the same generated admission boundary as JSON. */
export interface SportingLogoProps {
  identity: SportingIdentityResponse;
  kind: "club" | "team" | "division";
  size?: number;
  /** Places one admitted foreground logo and its optional same-image atmosphere in an owning card. */
  renderWithAtmosphere?: (logo: ReactNode, atmosphere: ReactNode) => ReactNode;
}

/** Shares the canonical image query between the visible crest and its optional decorative cover. */
function useSportingLogo(
  identity: SportingIdentityResponse,
  kind: SportingLogoProps["kind"],
) {
  const queries = useConsultationQueries();
  const options =
    kind === "club"
      ? queries.clubLogo(identity.id)
      : kind === "team"
        ? queries.teamLogo(identity.id)
        : queries.divisionLogo(identity.id);
  const query = useQuery({
    ...options,
    enabled: !!identity.logoUrl,
    ...consultationOpeningPolicy,
  });
  return { query, queryKey: options.queryKey };
}

/** Retains authorized artwork after refresh failure; missing/refused artwork keeps a readable identity. */
export function SportingLogo({
  identity,
  kind,
  size = tokens.size.media.row,
  renderWithAtmosphere,
}: SportingLogoProps) {
  const { query: logo, queryKey } = useSportingLogo(identity, kind);
  return (
    <SportingMedia
      key={`${hashKey(queryKey)}:${logo.dataUpdatedAt}`}
      identity={identity}
      kind={kind}
      size={size}
      uri={identity.logoUrl ? logo.data : undefined}
      loading={!!identity.logoUrl && logo.isPending}
      error={!!identity.logoUrl && logo.isError}
      renderWithAtmosphere={renderWithAtmosphere}
    />
  );
}

/** An optional, noninteractive competition-logo cover; absence/loading/failure adds no fake artwork. */
export function SportingArtwork({
  division,
}: {
  division: SportingDivisionResponse;
}) {
  const { query: logo, queryKey } = useSportingLogo(division, "division");
  return division.logoUrl && logo.data ? (
    <SportingCover
      key={`${hashKey(queryKey)}:${logo.dataUpdatedAt}`}
      uri={logo.data}
      primary={division.color}
    />
  ) : null;
}

/** Common profile inputs; follow/actions remain supplied by their owner once available. */
export interface SportingIdentityProps extends Omit<
  SportingLogoProps,
  "kind" | "renderWithAtmosphere"
> {
  kind: "club" | "team" | "pool";
  classification?: SportingClassificationResponse;
  season?: SportingSeasonResponse;
  subtitle?: string;
  children?: ReactNode;
}

/** Approved profile rail and wrapping identity metadata, with one optional owner action region. */
export function SportingIdentity({
  identity,
  kind,
  classification,
  season,
  subtitle,
  children,
}: SportingIdentityProps) {
  const { colors } = useTheme();
  const gender = genderLabel(classification?.gender);
  return (
    <View
      style={[
        styles.profile,
        {
          backgroundColor: colors.surface,
          borderColor: classification?.division?.color ?? colors.border,
        },
      ]}
    >
      <View style={[styles.rail, { backgroundColor: colors.subtle }]}>
        {classification?.division && (
          <DivisionPaint division={classification.division} />
        )}
        <SportingLogo
          identity={
            kind === "pool"
              ? (classification?.division ?? {
                  ...identity,
                  logoUrl: undefined,
                })
              : identity
          }
          kind={kind === "pool" ? "division" : kind}
          size={64}
        />
      </View>
      <View style={styles.identity}>
        <Text style={[styles.eyebrow, { color: colors.secondaryText }]}>
          {classification?.division?.name ??
            (kind === "club"
              ? "Le club"
              : kind === "team"
                ? "L’équipe"
                : "La poule")}
        </Text>
        <Text
          accessibilityRole="header"
          style={[
            kind === "club" ? styles.clubName : styles.name,
            { color: colors.text },
          ]}
        >
          {identity.name}
        </Text>
        {subtitle && (
          <Text style={[styles.eyebrow, { color: colors.secondaryText }]}>
            {subtitle}
          </Text>
        )}
        <View style={styles.metadata}>
          {[season?.label, formatLabel(classification?.format), gender]
            .filter(Boolean)
            .map((label) => (
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
        {children}
      </View>
    </View>
  );
}

/** Exact route destination supplied by the owning relationship, never derived from a display name. */
export interface SportingLinkProps {
  kind: "club" | "team" | "pool" | "match";
  id: string;
  label: string;
  identity?: SportingIdentityResponse;
}

/** Whole-row accessible resource link with an optional original-color identity image. */
export function SportingLink({ kind, id, label, identity }: SportingLinkProps) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => {
        if (kind === "club")
          router.push({ pathname: "/clubs/[clubId]", params: { clubId: id } });
        else if (kind === "team")
          router.push({ pathname: "/teams/[teamId]", params: { teamId: id } });
        else if (kind === "pool")
          router.push({ pathname: "/pools/[poolId]", params: { poolId: id } });
        else
          router.push({
            pathname: "/matches/[matchId]",
            params: { matchId: id },
          });
      }}
      style={({ pressed }) => [
        styles.link,
        { opacity: pressed ? tokens.opacity.pressed : 1 },
      ]}
    >
      {identity && kind !== "match" && (
        <SportingLogo
          identity={identity}
          kind={kind === "pool" ? "division" : kind}
        />
      )}
      <Text style={[styles.linkLabel, { color: colors.text }]}>{label}</Text>
      <ChevronRight
        accessible={false}
        size={tokens.size.icon.sm}
        color={colors.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: "row",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
    minHeight: 136,
  },
  rail: {
    width: 84,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  identity: {
    flex: 1,
    minWidth: 0,
    padding: tokens.spacing.md,
    paddingVertical: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  name: { ...tokens.typography.heading },
  clubName: { ...tokens.typography.navigation },
  eyebrow: { ...tokens.typography.metadata },
  metadata: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  badge: {
    ...tokens.typography.metadata,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.full,
    padding: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    minHeight: tokens.touch.minimum,
    paddingVertical: tokens.spacing.sm,
  },
  linkLabel: { ...tokens.typography.strong, flex: 1 },
});
