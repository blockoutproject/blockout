import { Image } from "expo-image";
import {
  CalendarDays,
  ChevronRight,
  type LucideIcon,
} from "lucide-react-native";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { PageHeader } from "../../../shared/components/page-header";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Surface } from "../../../shared/components/surface";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import type { useCollectionAuthority } from "../api/use-source-preparation";

/** Collection-only chrome for the active preparation destinations; safe areas and keyboard remain native-owned. */
export function PreparationPage({
  title,
  children,
  refreshing = false,
  refreshEnabled = true,
  onRefresh,
}: PropsWithChildren<{
  title: string;
  refreshing?: boolean;
  /** Keeps the native scroll tree mounted while a command temporarily suspends refresh. */
  refreshEnabled?: boolean;
  onRefresh?: () => void;
}>) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PageHeader title={title} />
      <FormScrollView
        contentContainerStyle={preparationStyles.content}
        refreshControl={
          onRefresh ? (
            <DataRefreshControl
              refreshing={refreshing}
              enabled={refreshEnabled}
              onRefresh={onRefresh}
            />
          ) : undefined
        }
      >
        {children}
      </FormScrollView>
    </SafeAreaView>
  );
}

/** Explains current identification/grant failures without discarding a mounted read-only draft. */
export function CollectionAccessFeedback({
  authority,
}: {
  authority: ReturnType<typeof useCollectionAuthority>;
}) {
  if (
    authority.sessionStatus === "restoring" ||
    (authority.sessionStatus === "authenticated" && authority.account.isPending)
  )
    return <RequestLoading />;
  if (authority.account.isError)
    return (
      <RequestError
        message="Les permissions du compte sont indisponibles."
        onRetry={() => void authority.account.refetch()}
        retrying={authority.account.isFetching}
      />
    );
  return authority.enabled ? null : (
    <RequestError message="Cette action nécessite une permission dédiée." />
  );
}

/** Approved collection empty-state artwork, retained as an unchanged Figma asset at its 120-point slot. */
export function EmptySources({ label }: { label: string }) {
  const { colors, scheme } = useTheme();
  return (
    <View
      style={[
        styles.empty,
        { backgroundColor: colors.raised, borderColor: colors.border },
      ]}
    >
      <Image
        accessible={false}
        source={
          scheme === "dark"
            ? require("../../../../assets/collection/empty-sources-dark.svg")
            : require("../../../../assets/collection/empty-sources.svg")
        }
        contentFit="contain"
        style={styles.emptyArtwork}
      />
      <Text
        style={[
          tokens.typography.heading,
          { color: colors.text, textAlign: "center" },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/** Navigation identity with an accessible action and decorative approved Lucide glyphs. */
export function PreparationLink({
  label,
  detail,
  statusTone,
  icon: Icon,
  onPress,
}: {
  label: string;
  detail?: string;
  statusTone?: "warning" | "success" | "error";
  icon: LucideIcon;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? tokens.opacity.pressed : 1,
      })}
    >
      <Surface>
        <View style={styles.link}>
          <Icon
            accessible={false}
            size={tokens.size.actionIcon}
            color={colors.icon}
          />
          <View style={styles.identity}>
            <Text style={[tokens.typography.strong, { color: colors.text }]}>
              {label}
            </Text>
            {detail && (
              <Text
                style={[
                  tokens.typography.metadata,
                  statusTone && styles.badge,
                  {
                    color:
                      statusTone === "warning"
                        ? colors.onWarning
                        : statusTone === "success"
                          ? colors.onSuccessSubtle
                          : statusTone === "error"
                            ? colors.error
                            : colors.secondaryText,
                    backgroundColor:
                      statusTone === "warning"
                        ? colors.warning
                        : statusTone === "success"
                          ? colors.successSubtle
                          : statusTone === "error"
                            ? colors.errorSubtle
                            : undefined,
                  },
                ]}
              >
                {detail}
              </Text>
            )}
          </View>
          <ChevronRight
            accessible={false}
            size={tokens.size.controlIcon}
            color={colors.icon}
          />
        </View>
      </Surface>
    </Pressable>
  );
}

/** Canonical season identity in the preparation context; never inferred from a provider identifier. */
export function SeasonIdentity({
  season,
}: {
  season: CollectionSeasonResponse;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.link}>
      <CalendarDays
        accessible={false}
        size={tokens.size.actionIcon}
        color={colors.icon}
      />
      <View>
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Saison
        </Text>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          {season.label}
        </Text>
      </View>
    </View>
  );
}

/** Source lifecycle labels prioritize immutable bindings over candidate qualification. */
export function sourceStatus(source: SourceBindingResponse) {
  if (source.locked || source.launched) return "Verrouillée";
  if (!source.candidateUrl) return "Source manquante";
  return {
    unvalidated: "À valider",
    pending: "Validation en attente",
    invalid: "Source indisponible",
    "confirmation-required": "À confirmer",
    qualified: "Prête",
  }[source.validation];
}

/** Canonical season lifecycle copy, distinct from source readiness and running collection. */
export function seasonStatus(season: CollectionSeasonResponse) {
  return { preparing: "À préparer", active: "Active", closed: "Clôturée" }[
    season.state
  ];
}

/** Noninteractive source evidence badge with approved semantic warning, success, information and error paints. */
export function SourceBadge({ source }: { source: SourceBindingResponse }) {
  const { colors } = useTheme();
  const locked = source.locked || source.launched;
  const foreground = locked
    ? colors.onInfo
    : source.validation === "qualified"
      ? colors.onSuccessAction
      : source.validation === "invalid"
        ? colors.error
        : colors.onWarning;
  const backgroundColor = locked
    ? colors.info
    : source.validation === "qualified"
      ? colors.successAction
      : source.validation === "invalid"
        ? colors.errorSubtle
        : colors.warning;
  return (
    <Text style={[styles.badge, { color: foreground, backgroundColor }]}>
      {sourceStatus(source)}
    </Text>
  );
}

/** Stable feature composition shared by the actual preparation screens and forms. */
export const preparationStyles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    gap: tokens.spacing.lg,
  },
  form: { gap: tokens.spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.compact,
    flexWrap: "wrap",
  },
});
const styles = StyleSheet.create({
  empty: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    gap: tokens.spacing.md,
    alignItems: "center",
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.section,
  },
  emptyArtwork: { width: 120, height: 120 },
  screen: { flex: 1 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
  },
  identity: { flex: 1, gap: tokens.spacing.xs },
  badge: {
    ...tokens.typography.metadata,
    alignSelf: "flex-start",
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.badge,
  },
});
