import {
  genderLabel,
  formatLabel,
} from "../../sporting/classification-presentation";
import type { SearchResult } from "../model/search-result";
import { relativeLuminance } from "../../../shared/theme/color-luminance";
import { hashKey, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SportingIdentityResponse } from "../../../../.generated/schemas/index.zod";
import { useConsultationQueries } from "../../sporting/api/use-consultation-queries";
import { LoadingIndicator } from "../../../shared/components/loading-indicator";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

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
  const foreground = division
    ? whiteOnPrimary(division.color)
      ? colors.onDarkAccent
      : colors.onLightAccent
    : colors.text;
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
      <View
        style={[
          styles.identity,
          {
            backgroundColor: division?.color ?? colors.subtle,
            backgroundImage: division
              ? division.gradient
                ? `linear-gradient(135deg, ${division.gradient[0]}, ${division.gradient[1]}, ${division.gradient[2]})`
                : "linear-gradient(135deg, #00000000, #00000014)"
              : undefined,
          },
        ]}
      >
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
            <LogoFallback identity={identity} />
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
          { borderColor: division ? `${division.color}4D` : colors.border },
        ]}
      />
    </View>
  );
}

/** Approved prototype 2177c35 chooses white only when its WCAG contrast against valid sRGB meets 4.5:1. */
function whiteOnPrimary(primary: string): boolean {
  const luminance = relativeLuminance(primary);
  return 1.05 / (luminance + 0.05) >= 4.5;
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
  if (identity.logoUrl && query.data)
    return (
      <ArtworkImage
        key={`${hashKey(options.queryKey)}:${query.dataUpdatedAt}`}
        uri={query.data}
        identity={identity}
        backgroundColor={backgroundColor}
        plate={kind !== "division"}
      />
    );
  return backgroundColor ? null : (
    <LogoFallback
      identity={identity}
      state={
        identity.logoUrl ? (query.isError ? "error" : "loading") : "missing"
      }
    />
  );
}

/** The Media/Image slot stays present; only supplied monograms replace the ordinary ImageOff fallback. */
function LogoFallback({
  identity,
  state = "missing",
}: {
  identity: SportingIdentityResponse;
  state?: "missing" | "loading" | "error";
}) {
  const { colors } = useTheme();
  const monogram = state === "missing" ? identity.shortName : undefined;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${state === "loading" ? "Chargement du logo" : state === "error" ? "Logo indisponible" : "Logo absent"} : ${identity.name}`}
      style={[
        styles.logo,
        {
          backgroundColor: monogram
            ? colors.logoSurface
            : colors.mediaPlaceholder,
        },
      ]}
    >
      {state === "loading" ? (
        <LoadingIndicator color={colors.icon} />
      ) : monogram ? (
        <Text style={[tokens.typography.strong, { color: colors.logoInk }]}>
          {monogram}
        </Text>
      ) : (
        <ImageOff
          accessible={false}
          color={colors.icon}
          size={tokens.size.actionIcon}
        />
      )}
    </View>
  );
}

/** Query owns decoded artwork; failure lasts until another successful read starts a native rendering attempt. */
function ArtworkImage({
  uri,
  identity,
  backgroundColor,
  plate,
}: {
  uri: string;
  identity: SportingIdentityResponse;
  backgroundColor?: string;
  plate: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const { colors } = useTheme();
  if (failed || !uri)
    return backgroundColor ? null : (
      <LogoFallback identity={identity} state={failed ? "error" : "loading"} />
    );
  return backgroundColor ? (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessible={false}
    >
      <Image
        accessible={false}
        source={{ uri }}
        cachePolicy="none"
        contentFit="contain"
        blurRadius={20}
        onError={() => setFailed(true)}
        style={styles.atmosphere}
      />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor, opacity: 0.28 }]}
      />
    </View>
  ) : (
    <View
      style={[
        styles.logo,
        { backgroundColor: plate ? colors.logoSurface : undefined },
      ]}
    >
      <Image
        accessibilityRole="image"
        accessibilityLabel={`Logo : ${identity.name}`}
        accessible
        source={{ uri }}
        cachePolicy="none"
        contentFit="contain"
        onError={() => setFailed(true)}
        style={plate ? styles.logoImage : styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.sheet,
    overflow: "hidden",
  },
  // Figma's inside stroke overlays the content without changing the header or classification geometry.
  edge: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
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
    minHeight: tokens.size.badge,
    justifyContent: "center",
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.badge,
    paddingVertical: tokens.spacing.xs - tokens.borderWidth,
    paddingHorizontal: tokens.spacing.sm,
    flexShrink: 1,
  },
  badgeLabel: { ...tokens.typography.metadata, maxWidth: 240 },
  logo: {
    width: tokens.size.entityMedia,
    height: tokens.size.entityMedia,
    borderRadius: tokens.radius.entityMedia,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: tokens.size.entityMedia - 2 * tokens.spacing.xs,
    height: tokens.size.entityMedia - 2 * tokens.spacing.xs,
  },
  // Product Design 916:2985: enlarged actual artwork, 20-point blur, 32% opacity, 28% primary veil.
  atmosphere: {
    position: "absolute",
    width: 574,
    height: 574,
    top: "50%",
    left: "50%",
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
    opacity: 0.32,
  },
});
