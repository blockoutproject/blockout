import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  SportingIdentityResponse,
  SportingClassificationResponse,
  SportingSeasonResponse,
  SportingDivisionResponse,
} from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useConsultationQueries } from "../api/use-consultation-queries";
import { ResourceText } from "./resource-page";

/** Addressed public identity; artwork reads use the same generated admission boundary as JSON. */
export interface SportingLogoProps {
  identity: SportingIdentityResponse;
  kind: "club" | "team" | "division";
  size?: number;
}

/** Keeps an accessible name beside missing/loading/failed artwork and never falls back to another owner. */
export function SportingLogo({ identity, kind, size = 40 }: SportingLogoProps) {
  const queries = useConsultationQueries();
  const options =
    kind === "club"
      ? queries.clubLogo(identity.id)
      : kind === "team"
        ? queries.teamLogo(identity.id)
        : queries.divisionLogo(identity.id);
  const logo = useQuery({
    ...options,
    enabled: !!identity.logoUrl,
    refetchOnMount: "always",
    retryOnMount: true,
  });
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.logo,
        { width: size, height: size, backgroundColor: colors.mediaPlaceholder },
      ]}
    >
      {identity.logoUrl && logo.data && !logo.isError ? (
        <LogoImage
          key={JSON.stringify(options.queryKey)}
          blob={logo.data}
          size={size}
        />
      ) : null}
      {(!identity.logoUrl || !logo.data || logo.isError) && (
        <Text
          accessible={false}
          style={[styles.initials, { color: colors.text }]}
        >
          {identity.shortName ??
            identity.name.slice(0, 2).toLocaleUpperCase("fr")}
        </Text>
      )}
      {identity.logoUrl && logo.isPending && (
        <Text style={[styles.logoState, { color: colors.secondaryText }]}>
          Chargement du logo
        </Text>
      )}
      {identity.logoUrl && logo.isError && (
        <Text style={[styles.logoState, { color: colors.secondaryText }]}>
          Logo indisponible
        </Text>
      )}
    </View>
  );
}

/** Converts a received Blob through the standard native FileReader; unmount aborts local decoding. */
function LogoImage({ blob, size }: { blob: Blob; size: number }) {
  const [uri, setUri] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setUri(reader.result);
    };
    reader.onerror = () => setFailed(true);
    reader.readAsDataURL(blob);
    return () => {
      reader.onload = null;
      reader.onerror = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [blob]);
  return failed ? (
    <ResourceText>Logo indisponible</ResourceText>
  ) : uri ? (
    <Image
      accessible={false}
      source={{ uri }}
      cachePolicy="none"
      contentFit="contain"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
    />
  ) : null;
}

/** Native three-stop paint; null gradients use the ordinary primary-to-shaded color treatment. */
export function DivisionPaint({
  division,
}: {
  division?: SportingDivisionResponse;
}) {
  const { colors } = useTheme();
  const color = division?.color ?? colors.subtle;
  const gradient = division?.gradient;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: color,
          backgroundImage: gradient
            ? `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 50%, ${gradient[2]} 100%)`
            : "linear-gradient(135deg, #00000000, #00000018)",
        },
      ]}
    />
  );
}

/** Common profile inputs; follow/actions remain supplied by their owner once available. */
export interface SportingIdentityProps extends Omit<SportingLogoProps, "kind"> {
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
  const gender =
    classification?.gender === "female"
      ? "Féminin"
      : classification?.gender === "male"
        ? "Masculin"
        : classification?.gender === "mixed"
          ? "Mixte"
          : undefined;
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
          {[season?.label, classification?.format?.replace("x", " × "), gender]
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
      style={styles.link}
    >
      {identity && kind !== "match" && (
        <SportingLogo
          identity={identity}
          kind={kind === "pool" ? "division" : kind}
        />
      )}
      <Text style={[styles.linkLabel, { color: colors.text }]}>{label}</Text>
      <ChevronRight accessible={false} size={16} color={colors.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: "row",
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
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
  logo: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.media,
    overflow: "hidden",
  },
  initials: { ...tokens.typography.navigation },
  logoState: { ...tokens.typography.metadata, textAlign: "center" },
  metadata: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  badge: {
    ...tokens.typography.metadata,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.full,
    padding: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    minHeight: tokens.touchTarget.android,
    paddingVertical: tokens.spacing.sm,
  },
  linkLabel: { ...tokens.typography.strong, flex: 1 },
});
