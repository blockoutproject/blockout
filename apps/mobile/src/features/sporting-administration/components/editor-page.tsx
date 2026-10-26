import { isAccessDenied } from "../../../shared/api/access-denied";
import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "../../../shared/components/page-header";
import {
  FormScrollView,
  type FormScrollViewProps,
} from "../../../shared/components/form-scroll-view";
import {
  RequestError,
  RequestLoading,
  AccessDenied,
} from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import type { useSportingAuthority } from "../api/classification";
/** Sporting operation chrome uses the existing native keyboard, safe-area and theme ownership. */
export function EditorPage({
  title,
  children,
  scrollable = true,
  refreshControl,
  state,
}: PropsWithChildren<{
  title: string;
  scrollable?: boolean;
  /** The reading screen owns data refresh; static editors can omit it. */
  refreshControl?: FormScrollViewProps["refreshControl"];
  /** Blocking feedback replaces the editor only before a usable draft exists. */
  state?: ReactNode;
}>) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PageHeader title={title} />
      {scrollable || state ? (
        <FormScrollView
          contentContainerStyle={state ? styles.stateContent : styles.content}
          refreshControl={refreshControl}
        >
          {state ? <ScreenState>{state}</ScreenState> : children}
        </FormScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
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
  if (isAccessDenied(authority.account.error)) return <AccessDenied />;
  if (authority.account.isError)
    return (
      <RequestError
        message="Les permissions du compte sont indisponibles."
        onRetry={() => void authority.account.refetch()}
        retrying={authority.account.isFetching}
      />
    );
  return authority.enabled ? null : <AccessDenied />;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  stateContent: { flexGrow: 1, padding: tokens.spacing.lg },
  content: {
    flexGrow: 1,
    padding: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    gap: tokens.spacing.lg,
  },
});
