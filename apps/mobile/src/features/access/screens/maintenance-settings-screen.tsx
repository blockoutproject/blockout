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
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { useMaintenanceSettings } from "../api/use-maintenance-settings";
import { MaintenanceSettingsForm } from "../forms/maintenance-settings-form";

const FormScrollView =
  Platform.OS === "ios" ? ScrollView : KeyboardAwareScrollView;
/** Route-owned unsaved-change prevention receives only the form's coarse editing state. */
export interface MaintenanceSettingsScreenProps {
  onDirtyChange?: (dirty: boolean) => void;
}
/** Isolated authorized maintenance component; production route admission remains with its route owner. */
export function MaintenanceSettingsScreen(
  props: MaintenanceSettingsScreenProps,
) {
  return Platform.OS === "android" ? (
    <KeyboardProvider>
      <MaintenanceContent {...props} />
    </KeyboardProvider>
  ) : (
    <MaintenanceContent {...props} />
  );
}
/** Loads only with current grants and retains an existing draft read-only when they become unavailable. */
function MaintenanceContent({ onDirtyChange }: MaintenanceSettingsScreenProps) {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const canManage = permissions?.manageMaintenance === true;
  const editing = useMaintenanceSettings(canManage);
  const { colors } = useTheme();
  const router = useRouter();
  const settings =
    sessionStatus === "authenticated" ? editing.query.data : undefined;
  let accessError = null;
  if (account.isError) {
    accessError = (
      <RequestError
        message="Les permissions du compte sont indisponibles."
        onRetry={() => void account.refetch()}
        retrying={account.isFetching}
      />
    );
  } else if (!canManage) {
    accessError = (
      <RequestError message="Cette action nécessite une permission dédiée." />
    );
  }
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
          Administration technique
        </Text>
      </View>
      <FormScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {sessionStatus === "restoring" ||
        (sessionStatus === "authenticated" && account.isPending) ? (
          <RequestLoading />
        ) : (
          <>
            {accessError}
            {settings ? (
              <MaintenanceSettingsForm
                key={`${session.generation}:${session.accountId}`}
                settings={settings}
                editing={editing}
                disabled={!canManage}
                onDirtyChange={onDirtyChange}
              />
            ) : (
              !accessError &&
              (editing.query.isError ? (
                <RequestError
                  message="Les réglages de maintenance sont indisponibles."
                  onRetry={() => void editing.query.refetch()}
                  retrying={editing.query.isFetching}
                />
              ) : (
                <RequestLoading />
              ))
            )}
            {settings && editing.query.isError && (
              <RequestError message="La relecture a échoué. Votre brouillon est conservé." />
            )}
          </>
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
  },
  title: { ...tokens.typography.heading, flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.lg },
});
