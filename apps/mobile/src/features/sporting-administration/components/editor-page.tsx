import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { PropsWithChildren } from "react";
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
import type { useSportingAuthority } from "../api/classification";
const FormScrollView =
  Platform.OS === "ios" ? ScrollView : KeyboardAwareScrollView;
/** Sporting operation chrome uses the existing native keyboard, safe-area and theme ownership. */
export function EditorPage({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  const { colors } = useTheme();
  const router = useRouter();
  const page = (
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
        <View style={styles.rail} />
      </View>
      <FormScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {children}
      </FormScrollView>
    </SafeAreaView>
  );
  return Platform.OS === "android" ? (
    <KeyboardProvider>{page}</KeyboardProvider>
  ) : (
    page
  );
}
/** Failed account refresh suspends actions while the retained RHF draft remains read-only. */
export function SportingAccessFeedback({
  authority,
}: {
  authority: ReturnType<typeof useSportingAuthority>;
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
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  title: { ...tokens.typography.navigation, flex: 1, textAlign: "center" },
  rail: { width: tokens.touchTarget.android },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.lg },
});
