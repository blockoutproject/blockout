import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
} from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "../../../shared/components/icon-button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useAccountSession } from "../../accounts/current-account";
import { useAdministrationCapabilities } from "../../access/api/use-administration-capabilities";
import { usePresentation, type PresentationTarget } from "../api/presentation";
import { PresentationForm } from "../forms/presentation-form";

const FormScrollView =
  Platform.OS === "ios" ? ScrollView : KeyboardAwareScrollView;
/** Route-owned target and unsaved navigation guard; action grants are read from the current F12 account. */
export interface PresentationScreenProps {
  target: PresentationTarget;
  onDirtyChange?: (dirty: boolean) => void;
}
/** Composes the approved editor using the platform's existing ordinary-form keyboard mechanism. */
export function PresentationScreen(props: PresentationScreenProps) {
  return Platform.OS === "android" ? (
    <KeyboardProvider>
      <PresentationContent {...props} />
    </KeyboardProvider>
  ) : (
    <PresentationContent {...props} />
  );
}
/** Current-session administrative data and a retained read-only draft when its action grant becomes unavailable. */
function PresentationContent({
  target,
  onDirtyChange,
}: PresentationScreenProps) {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const canManage = permissions?.manageSportingPresentation === true;
  const editing = usePresentation(target, canManage);
  const { colors } = useTheme();
  const router = useRouter();
  const presentation =
    sessionStatus === "authenticated" ? editing.query.data : undefined;
  const pending =
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" && account.isPending);
  const title =
    target.kind === "team"
      ? "Modifier l’équipe"
      : target.kind === "club"
        ? "Modifier le club"
        : target.kind === "pool"
          ? "Modifier la poule"
          : "Modifier la division";
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
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
        <View style={styles.headerRail} />
      </View>
      <FormScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {pending ? (
          <RequestLoading />
        ) : account.isError ? (
          <RequestError
            message="Les permissions du compte sont indisponibles."
            onRetry={() => void account.refetch()}
            retrying={account.isFetching}
          />
        ) : !canManage ? (
          <RequestError message="Cette action nécessite une permission dédiée." />
        ) : null}
        {presentation ? (
          <PresentationForm
            key={`${session.generation}:${target.kind}:${target.id}`}
            presentation={presentation}
            target={target}
            editing={editing}
            disabled={!canManage}
            onDirtyChange={onDirtyChange}
          />
        ) : (
          canManage &&
          (editing.query.isError ? (
            <RequestError
              message="La présentation est indisponible."
              onRetry={() => void editing.query.refetch()}
              retrying={editing.query.isFetching}
            />
          ) : (
            <RequestLoading />
          ))
        )}
      </FormScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.sm,
    minHeight: tokens.size.control,
  },
  headerRail: { width: tokens.touchTarget.android },
  title: { ...tokens.typography.navigation, flex: 1, textAlign: "center" },
  content: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
});
