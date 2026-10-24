import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react-native";
import type { PropsWithChildren } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
} from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { IconButton } from "../../../shared/components/icon-button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import type { useCollectionAuthority } from "../api/use-source-preparation";

const FormScrollView =
  Platform.OS === "ios" ? ScrollView : KeyboardAwareScrollView;

/** Collection-only chrome for the active preparation destinations; safe areas and keyboard remain native-owned. */
export function PreparationPage({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  const { colors } = useTheme();
  const content = (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PreparationHeader title={title} />
      <FormScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={preparationStyles.content}
      >
        {children}
      </FormScrollView>
    </SafeAreaView>
  );
  return Platform.OS === "android" ? (
    <KeyboardProvider>{content}</KeyboardProvider>
  ) : (
    content
  );
}

/** Balanced approved top bar; the owning route supplies ordinary back navigation. */
export function PreparationHeader({ title }: { title: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <IconButton label="Retour" onPress={() => router.back()}>
        <ChevronLeft
          accessible={false}
          size={tokens.size.actionIcon}
          color={colors.icon}
        />
      </IconButton>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      <View style={styles.rail} />
    </View>
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

/** Local flat source/season surface, using the existing semantic theme rather than a feature theme. */
export function PreparationCard({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        preparationStyles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

/** Approved collection empty-state artwork, retained as an unchanged Figma asset at its 120-point slot. */
export function EmptySources({ label }: { label: string }) {
  const { colors, scheme } = useTheme();
  return (
    <View
      style={[
        preparationStyles.card,
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
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      style={[
        preparationStyles.card,
        styles.link,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
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
    padding: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    gap: tokens.spacing.lg,
  },
  card: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
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
    alignItems: "center",
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.section,
  },
  emptyArtwork: { width: 120, height: 120 },
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.lg,
    minHeight: tokens.size.control,
    gap: tokens.spacing.sm,
  },
  title: { ...tokens.typography.navigation, flex: 1, textAlign: "center" },
  rail: {
    width:
      Platform.OS === "ios"
        ? tokens.touchTarget.ios
        : tokens.touchTarget.android,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
    minHeight: tokens.size.control,
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
