import { useContext } from "react";
import { genderLabel, formatLabel } from "../classification-presentation";
import { SportingLink } from "../link";
import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  SportingIdentityResponse,
  SportingClassificationResponse,
  SportingSeasonResponse,
  SportingDivisionResponse,
} from "../../../../.generated/schemas/index.zod";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useSportingLogo } from "../api/use-sporting-logo";
import {
  SportingMedia,
  SportingCover,
  type SportingMediaProps,
} from "./sporting-media";
import {
  ArtworkHalo,
  centeredLeadingHalo,
} from "@/shared/components/artwork-halo";
import { IdentityCard } from "@/shared/components/identity-card";
import { SportingIdentityRevealContext } from "./sporting-initial-composition";

/** Addressed sporting identity; public native artwork and explicit bypass share the owning resource guard. */
export type SportingLogoProps = Pick<
  SportingMediaProps,
  | "kind"
  | "size"
  | "nativeSize"
  | "presentation"
  | "renderWithAtmosphere"
  | "atmosphere"
> & {
  identity: SportingIdentityResponse;
};

/** Native image failure keeps a readable identity; known resource restriction withdraws foreground and atmosphere. */
export function SportingLogo({
  identity,
  ...media
}: Readonly<SportingLogoProps>) {
  const logo = useSportingLogo(identity, media.kind);
  return (
    <SportingMedia key={identity.id} identity={identity} {...media} {...logo} />
  );
}

/** An optional, noninteractive competition-logo cover; absence/loading/failure adds no fake artwork. */
export function SportingArtwork({
  division,
}: Readonly<{
  division: SportingDivisionResponse;
}>) {
  const logo = useSportingLogo(division, "division");
  return logo.uri ? (
    <SportingCover
      key={`${division.id}:${division.logoUrl ?? ""}`}
      uri={logo.uri}
      primary={division.color}
    />
  ) : null;
}

/** Resolves the team's division image independently of its foreground crest. */
export function SportingDivisionAtmosphere({
  division,
  presentation,
}: Readonly<{
  division: SportingDivisionResponse;
  presentation: "identity" | "entity";
}>) {
  const { uri } = useSportingLogo(division, "division");
  if (!uri) {
    return null;
  }
  return (
    <ArtworkHalo
      key={uri}
      uri={uri}
      placement={presentation === "identity" ? centeredLeadingHalo : undefined}
    />
  );
}

/** Common profile inputs; follow/actions remain supplied by their owner once available. */
export interface SportingIdentityProps {
  identity: SportingIdentityResponse;
  kind: "club" | "team" | "pool";
  classification?: SportingClassificationResponse;
  season?: SportingSeasonResponse;
  subtitle?: string;
  /** The associated club opens through the compact metadata chip, without displaying its name. */
  clubId?: string;
  children?: ReactNode;
}

/** Identity metadata/actions retain independent image decoding; pool names use at most two lines with their full accessible name. */
export function SportingIdentity({
  identity,
  kind,
  classification,
  season,
  subtitle,
  clubId,
  children,
}: Readonly<SportingIdentityProps>) {
  /** Names the identity kind only when the accepted classification supplies no division name. */
  function identityKindLabel() {
    if (kind === "club") {
      return "Le club";
    }
    if (kind === "team") {
      return "L’équipe";
    }
    return "La poule";
  }

  const { colors } = useTheme();
  const revealStyle = useContext(SportingIdentityRevealContext);
  const division = classification?.division;
  const logoIdentity =
    kind === "pool"
      ? (division ?? { ...identity, logoUrl: undefined })
      : identity;
  const logoKind = kind === "pool" ? "division" : kind;
  const logo = useSportingLogo(logoIdentity, logoKind);
  const gender = genderLabel(classification?.gender);
  const metadata = [
    season?.label,
    formatLabel(classification?.format),
    gender,
  ].filter(Boolean);

  const atmosphere =
    kind === "team"
      ? division && (
          <SportingDivisionAtmosphere
            division={division}
            presentation="identity"
          />
        )
      : logo.uri &&
        !logo.error && (
          <ArtworkHalo
            key={logo.uri}
            uri={logo.uri}
            placement={centeredLeadingHalo}
          />
        );

  return (
    <IdentityCard
      style={revealStyle}
      artwork={
        <SportingMedia
          identity={logoIdentity}
          kind={logoKind}
          uri={logo.uri}
          loading={logo.loading}
          error={logo.error}
          size={tokens.size.media.profile}
          presentation="identity"
        />
      }
      atmosphere={atmosphere}
      borderColor={
        division ? `${division.color}${colors.contextBorderAlpha}` : undefined
      }
    >
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: colors.secondaryText }]}>
          {division?.name ?? identityKindLabel()}
        </Text>
        <Text
          accessibilityRole="header"
          accessibilityLabel={identity.name}
          numberOfLines={kind === "pool" ? 2 : undefined}
          ellipsizeMode="tail"
          style={[
            kind === "club" ? styles.clubName : styles.name,
            { color: colors.text },
          ]}
        >
          {identity.name}
        </Text>
      </View>
      {subtitle && (
        <Text style={[styles.eyebrow, { color: colors.secondaryText }]}>
          {subtitle}
        </Text>
      )}
      {(metadata.length > 0 || !!clubId) && (
        <View style={[styles.metadata, clubId && styles.metadataWithClub]}>
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
          {clubId && <ClubBadge key={clubId} clubId={clubId} />}
        </View>
      )}
      {children}
    </IdentityCard>
  );
}

/** Keeps the club chip visually equal to its metadata peers inside a native minimum-size touch target. */
function ClubBadge({ clubId }: Readonly<{ clubId: string }>) {
  const { colors } = useTheme();
  return (
    <SportingLink
      kind="club"
      id={clubId}
      label="Le club"
      style={styles.clubTarget}
    >
      <View
        style={[styles.badge, styles.clubBadge, { borderColor: colors.border }]}
      >
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Le club
        </Text>
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.secondaryText}
        />
      </View>
    </SportingLink>
  );
}

const styles = StyleSheet.create({
  heading: { gap: tokens.spacing.xs },
  name: { ...tokens.typography.heading },
  clubName: { ...tokens.typography.navigation },
  eyebrow: { ...tokens.typography.metadata },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  metadataWithClub: { rowGap: tokens.spacing.xs },
  badge: {
    ...tokens.typography.metadata,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.full,
    padding: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  clubTarget: {
    minHeight: tokens.touch.minimum,
    minWidth: tokens.touch.minimum,
    justifyContent: "center",
  },
  clubBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
});
