import { genderLabel, formatLabel } from "../classification-presentation";
import { useSportingNavigation } from "../navigation";
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
import { useSportingLogo } from "../api/use-sporting-logo";
import {
  SportingMedia,
  SportingCover,
  type SportingMediaProps,
} from "./sporting-media";
import { DivisionPaint } from "./division-paint";
import { IdentityCard } from "../../../shared/components/identity-card";
import { IdentityArtwork } from "../../../shared/components/identity-artwork";
import { IdentityAtmosphere } from "../../../shared/components/identity-atmosphere";
import { ImageFallback } from "../../../shared/components/image-fallback";

/** Addressed sporting identity; public native artwork and explicit bypass share the owning resource guard. */
export interface SportingLogoProps {
  identity: SportingIdentityResponse;
  kind: "club" | "team" | "division";
  size?: number;
  presentation?: SportingMediaProps["presentation"];
  /** Places one admitted foreground logo and its optional same-image atmosphere in an owning card. */
  renderWithAtmosphere?: (logo: ReactNode, atmosphere: ReactNode) => ReactNode;
}

/** Native image failure keeps a readable identity; known resource restriction withdraws foreground and atmosphere. */
export function SportingLogo({
  identity,
  kind,
  size = tokens.size.media.row,
  presentation,
  renderWithAtmosphere,
}: Readonly<SportingLogoProps>) {
  const logo = useSportingLogo(identity, kind);
  return (
    <SportingMedia
      key={`${identity.id}:${identity.logoUrl ?? ""}`}
      identity={identity}
      kind={kind}
      size={size}
      presentation={presentation}
      uri={logo.uri}
      loading={logo.loading}
      error={logo.error}
      renderWithAtmosphere={renderWithAtmosphere}
    />
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

/** Common profile inputs; follow/actions remain supplied by their owner once available. */
export interface SportingIdentityProps extends Omit<
  SportingLogoProps,
  "kind" | "renderWithAtmosphere" | "presentation"
> {
  kind: "club" | "team" | "pool";
  classification?: SportingClassificationResponse;
  season?: SportingSeasonResponse;
  subtitle?: string;
  /** The associated club opens through the compact metadata chip, without displaying its name. */
  clubId?: string;
  children?: ReactNode;
}

/** Approved identity metadata and actions remain mounted while each authorized image layer handles its own decoding. */
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
  const logoIdentity =
    kind === "pool"
      ? (classification?.division ?? { ...identity, logoUrl: undefined })
      : identity;
  const logo = useSportingLogo(
    logoIdentity,
    kind === "pool" ? "division" : kind,
  );
  let imageLabel;
  if (logo.uri) {
    if (logo.error) {
      imageLabel = "Logo non actualisé";
    } else {
      imageLabel = "Logo";
    }
  } else if (logo.loading) {
    imageLabel = "Chargement du logo";
  } else {
    imageLabel = "Logo";
  }
  const gender = genderLabel(classification?.gender);
  const metadata = [
    season?.label,
    formatLabel(classification?.format),
    gender,
  ].filter(Boolean);
  return (
    <IdentityCard
      artwork={
        <IdentityArtwork
          key={logo.uri}
          uri={logo.uri}
          loading={logo.loading}
          label={`${imageLabel} : ${logoIdentity.name}`}
          contentFit="contain"
          cachePolicy="none"
          fallback={
            <ImageFallback
              color={colors.logoInk}
              label={`${logo.uri || logo.error ? "Logo indisponible" : "Logo absent"} : ${logoIdentity.name}`}
            />
          }
        />
      }
      atmosphere={
        logo.uri ? (
          <IdentityAtmosphere
            key={logo.uri}
            uri={logo.uri}
            testID="sporting-logo-atmosphere"
          />
        ) : undefined
      }
      railBackground={
        logo.uri && classification?.division ? (
          <DivisionPaint division={classification.division} />
        ) : undefined
      }
      borderColor={classification?.division?.color}
    >
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: colors.secondaryText }]}>
          {classification?.division?.name ?? identityKindLabel()}
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
      </View>
      {subtitle && (
        <Text style={[styles.eyebrow, { color: colors.secondaryText }]}>
          {subtitle}
        </Text>
      )}
      {(metadata.length > 0 || !!clubId) && (
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
          {clubId && <ClubBadge key={clubId} clubId={clubId} />}
        </View>
      )}
      {children}
    </IdentityCard>
  );
}

/** Keeps the club chip visually equal to its metadata peers inside a native minimum-size touch target. */
function ClubBadge({ clubId }: Readonly<{ clubId: string }>) {
  const sporting = useSportingNavigation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Le club"
      onPress={() => void sporting.navigate("club", clubId)}
      style={({ pressed }) => [
        styles.clubTarget,
        { opacity: pressed ? tokens.opacity.pressed : 1 },
      ]}
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
    </Pressable>
  );
}

/** Exact route destination supplied by the owning relationship, never derived from a display name. */
export interface SportingLinkProps {
  kind: "club" | "team" | "pool" | "match";
  id: string;
  label: string;
  identity?: SportingIdentityResponse;
  /** A retained inactive native panel must not continue a former resource-link action. */
  active?: boolean;
}

/** Whole-row accessible resource link with an optional original-color identity image. */
export function SportingLink({
  kind,
  id,
  label,
  identity,
  active = true,
}: Readonly<SportingLinkProps>) {
  const sporting = useSportingNavigation(active);
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void sporting.navigate(kind, id)}
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
      {!identity && kind === "pool" && (
        <SportingMedia identity={{ name: label }} kind="division" />
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
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    minHeight: tokens.touch.minimum,
    paddingVertical: tokens.spacing.sm,
  },
  linkLabel: { ...tokens.typography.strong, flex: 1 },
});
