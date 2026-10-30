import { genderLabel, formatLabel } from "../classification-presentation";
import { divisionTextColor } from "../presentation";
import { DivisionPaint } from "./division-paint";
import { SportingMedia, SportingCover } from "./sporting-media";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type {
  SportingIdentityResponse,
  SportingClassificationResponse,
  SportingSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { useSportingLogo } from "../api/use-sporting-logo";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

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
}: SportingEntityCardProps) {
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
  const label = [identity.name, subtitle, ...metadata.map(({ label }) => label)]
    .filter(Boolean)
    .join(", ");
  const style = [styles.card, { backgroundColor: colors.surface }];
  const content = (
    <>
      <View style={styles.identity}>
        <DivisionPaint division={division} />
        {division?.logoUrl && (
          <EntityArtwork
            identity={division}
            kind="division"
            backgroundColor={division.color}
          />
        )}
        {kind === "pool" ? (
          division ? (
            <EntityArtwork identity={division} kind="division" />
          ) : (
            <SportingMedia
              identity={identity}
              kind="division"
              size={tokens.size.media.entity}
              presentation="entity"
            />
          )
        ) : (
          <EntityArtwork identity={identity} kind={kind} />
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
        {onPress && (
          <ChevronRight
            accessible={false}
            size={tokens.size.icon.sm}
            color={foreground}
          />
        )}
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

/** Native public artwork and credentialed bypass share the same exact resource withdrawal guard. */
function EntityArtwork({
  identity,
  kind,
  backgroundColor,
}: {
  identity: SportingIdentityResponse;
  kind: "club" | "team" | "division";
  backgroundColor?: string;
}) {
  const logo = useSportingLogo(identity, kind);
  if (backgroundColor)
    return logo.uri ? (
      <SportingCover
        key={`${identity.id}:${identity.logoUrl ?? ""}`}
        uri={logo.uri}
        primary={backgroundColor}
      />
    ) : null;
  return (
    <SportingMedia
      key={`${identity.id}:${identity.logoUrl ?? ""}`}
      identity={identity}
      kind={kind}
      size={tokens.size.media.entity}
      presentation="entity"
      uri={logo.uri}
      loading={logo.loading}
      error={logo.error}
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
