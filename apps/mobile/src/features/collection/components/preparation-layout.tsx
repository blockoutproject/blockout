import {
  CalendarDays,
  ChevronRight,
  type LucideIcon,
} from "lucide-react-native";
import type { PropsWithChildren, ReactNode } from "react";
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
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { ErrorState } from "../../../shared/components/state-card";
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
  state,
}: PropsWithChildren<{
  title: string;
  refreshing?: boolean;
  /** Keeps the native scroll tree mounted while a command temporarily suspends refresh. */
  refreshEnabled?: boolean;
  onRefresh?: () => void;
  /** Blocking feedback replaces content only before a usable representation or draft exists. */
  state?: ReactNode;
}>) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PageHeader title={title} />
      <FormScrollView
        contentContainerStyle={
          state ? styles.stateContent : preparationStyles.content
        }
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
        {state ? <ScreenState>{state}</ScreenState> : children}
      </FormScrollView>
    </SafeAreaView>
  );
}

/** Initial authority feedback only; retained editor refresh failures use the owning event toast. */
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
      <ErrorState
        onRetry={() => void authority.account.refetch()}
        retrying={authority.account.isFetching}
      />
    );
  return authority.enabled ? null : <ErrorState />;
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
  stateContent: { flexGrow: 1, padding: tokens.spacing.lg },
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
