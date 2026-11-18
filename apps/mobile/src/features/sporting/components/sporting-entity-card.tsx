import { genderLabel, formatLabel } from "../classification-presentation";
import { divisionTextColor } from "../presentation";
import { SportingLogo } from "./sporting-identity";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type {
  SportingIdentityResponse,
  SportingClassificationResponse,
  SportingSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";

/** Entity Card metadata uses a 24-point badge minimum; its loading representation shares this owner. */
export const entityBadgeSize = 24;

/** Current public sporting summary slots; omitted facts remain absent and opening belongs to the caller. */
export interface SportingEntityCardProps {
  kind: "club" | "team" | "pool";
  identity: SportingIdentityResponse;
  city?: string;
  subtitle?: string;
  classification?: SportingClassificationResponse;
  season?: SportingSeasonResponse;
  layout?: "discovery" | "club-team";
  /** Makes the whole card an accessible link with the approved disclosure; the caller owns exact navigation. */
  onPress?: () => void;
}

/** Product Design Entity Card 354:565 groups current identity, admitted artwork and distinguishing metadata. */
export function SportingEntityCard({
  kind,
  identity,
  city,
  subtitle,
  classification,
  season,
  onPress,
  layout = "discovery",
}: Readonly<SportingEntityCardProps>) {
  const { colors } = useTheme();
  const clubTeam = layout === "club-team";
  const division = classification?.division;
  const divisionContent = division
    ? divisionTextColor(division.color)
    : colors.text;
  const format = formatLabel(classification?.format);
  const gender = genderLabel(classification?.gender);
  const metadata = (
    clubTeam
      ? [
          { id: "gender", label: gender },
          { id: "format", label: format },
        ]
      : [
          { id: "city", label: city },
          { id: "division", label: division?.name },
          { id: "season", label: season?.label },
          { id: "format", label: format },
          { id: "gender", label: gender },
        ]
  ).filter(({ label }) => label !== undefined);
  const label = clubTeam
    ? identity.name
    : [identity.name, subtitle, ...metadata.map(({ label }) => label)]
        .filter(Boolean)
        .join(", ");
  const outline =
    division && !clubTeam
      ? `${division.color}${colors.contextBorderAlpha}`
      : colors.border;
  const style = [
    styles.card,
    clubTeam && styles.clubTeam,
    { backgroundColor: colors.surface, boxShadow: colors.cardShadow },
  ];
  const badges = metadata.length > 0 && (
    <View style={clubTeam ? styles.clubBadges : styles.metadata}>
      {metadata.map(({ id, label }) => (
        <View
          key={id}
          style={[
            styles.badge,
            clubTeam && styles.clubBadge,
            {
              backgroundColor:
                id === "division"
                  ? division?.color
                  : clubTeam
                    ? "transparent"
                    : colors.subtle,
              borderColor: id === "division" ? "transparent" : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeLabel,
              {
                color:
                  id === "division" ? divisionContent : colors.secondaryText,
              },
            ]}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
  const disclosure = onPress && (
    <ChevronRight
      accessible={false}
      size={tokens.size.icon.sm}
      color={colors.icon}
    />
  );

  /** The same admitted foreground URI supplies the passive left halo and the sharp card artwork. */
  function renderCard(logo: ReactNode, atmosphere: ReactNode) {
    const content = (
      <>
        {clubTeam ? (
          <>
            {atmosphere}
            <View style={styles.clubRail}>{logo}</View>
            <View style={styles.clubCopy}>
              {division && (
                <Text
                  style={[
                    tokens.typography.metadata,
                    { color: colors.secondaryText },
                  ]}
                >
                  {division.name}
                </Text>
              )}
              <Text
                numberOfLines={2}
                style={[tokens.typography.strong, { color: colors.text }]}
              >
                {identity.name}
              </Text>
              {badges}
            </View>
            {disclosure}
          </>
        ) : (
          <>
            <View style={styles.identity}>
              {atmosphere}
              {logo}
              <View style={styles.name}>
                <Text
                  accessibilityRole="header"
                  style={[tokens.typography.navigation, { color: colors.text }]}
                >
                  {identity.name}
                </Text>
                {subtitle && (
                  <Text
                    style={[
                      tokens.typography.metadata,
                      { color: colors.secondaryText },
                    ]}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
              {disclosure}
            </View>
            {badges}
          </>
        )}
        <View
          pointerEvents="none"
          accessible={false}
          style={[
            StyleSheet.absoluteFill,
            styles.edge,
            { borderColor: outline },
          ]}
        />
      </>
    );
    return onPress ? (
      <Pressable
        accessible
        accessibilityRole="link"
        accessibilityLabel={label}
        onPress={onPress}
        style={style}
      >
        {content}
      </Pressable>
    ) : (
      <View accessible accessibilityLabel={label} style={style}>
        {content}
      </View>
    );
  }

  const logoIdentity =
    kind === "pool"
      ? (division ?? { ...identity, logoUrl: undefined })
      : identity;
  return (
    <SportingLogo
      identity={logoIdentity}
      kind={kind === "pool" ? "division" : kind}
      size={
        clubTeam ? tokens.sporting.clubTeam.logoSize : tokens.size.media.entity
      }
      presentation="entity"
      renderWithAtmosphere={renderCard}
    />
  );
}

/** Neutral copies of the requested card reserve a first read without admitting identities. */
export function SportingEntityCardLoading({
  label,
  layout = "discovery",
}: Readonly<{ label: string; layout?: SportingEntityCardProps["layout"] }>) {
  return (
    <LoadingGroup label={label} style={styles.loadingCards}>
      {Array.from({ length: 3 }, (_, index) => (
        <EntityCardSkeleton key={index} clubTeam={layout === "club-team"} />
      ))}
    </LoadingGroup>
  );
}

/** Uses that card's ready media, badges and overlay border without painting division color or logos. */
function EntityCardSkeleton({ clubTeam }: Readonly<{ clubTeam: boolean }>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        clubTeam && styles.clubTeam,
        { backgroundColor: colors.surface },
      ]}
    >
      {clubTeam ? (
        <>
          <View style={styles.clubRail}>
            <Skeleton
              width={tokens.sporting.clubTeam.logoSize}
              height={tokens.sporting.clubTeam.logoSize}
              radius={tokens.media.radius.tile}
            />
          </View>
          <View style={styles.clubCopy}>
            <Skeleton
              width="32%"
              height={tokens.typography.metadata.lineHeight}
            />
            <Skeleton width="80%" />
            <View style={styles.clubBadges}>
              <Skeleton width={58} height={entityBadgeSize} />
              <Skeleton width={32} height={entityBadgeSize} />
            </View>
          </View>
          <Skeleton width={tokens.size.icon.sm} height={tokens.size.icon.sm} />
        </>
      ) : (
        <>
          <View style={styles.identity}>
            <Skeleton
              width={tokens.size.media.entity}
              height={tokens.size.media.entity}
              radius={tokens.media.radius.tile}
            />
            <View style={styles.name}>
              <Skeleton />
              <Skeleton width="75%" height={12} />
            </View>
            <Skeleton
              width={tokens.size.icon.sm}
              height={tokens.size.icon.sm}
            />
          </View>
          <View style={styles.metadata}>
            <Skeleton width={96} height={entityBadgeSize} />
            <Skeleton width={76} height={entityBadgeSize} />
            <Skeleton width={52} height={entityBadgeSize} />
          </View>
        </>
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.edge,
          { borderColor: colors.border },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingCards: { gap: tokens.layout.list.gap },
  card: {
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  clubTeam: {
    minHeight: tokens.sporting.clubTeam.minHeight,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  clubRail: {
    width: tokens.sporting.clubTeam.railWidth,
    alignItems: "center",
  },
  clubCopy: {
    flex: 1,
    minWidth: 0,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.tight,
  },
  clubBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
  },
  clubBadge: { borderRadius: tokens.radius.full },
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
    minHeight: entityBadgeSize,
    justifyContent: "center",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.xs - tokens.border.thin,
    paddingHorizontal: tokens.spacing.sm,
    flexShrink: 1,
  },
  badgeLabel: tokens.typography.metadata,
});
