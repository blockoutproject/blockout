import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  Page,
  PageContent,
  PageScrollView,
} from "../../../shared/components/page";
import { PageViewport } from "../../../shared/components/navigation-backdrop";
import { ScreenState } from "../../../shared/components/screen-state";
import { ErrorState } from "../../../shared/components/state-card";
import { hasReadError } from "../../../shared/components/read-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";

/** An existing Query result supplies indispensable data and safe read recovery, never a copied cache. */
export type SportingInitialRead = Pick<
  UseQueryResult<unknown, Error>,
  "data" | "isError" | "isPending" | "errorUpdatedAt" | "isFetching" | "refetch"
>;

/** The public page retains its real measured scenes while one initial presentation owns unresolved inputs. */
export interface SportingInitialCompositionProps {
  detail: SportingInitialRead;
  follow?: SportingInitialRead;
  header: ReactNode;
  loading: ReactNode;
  children: ReactNode;
}

/** Common detail and applicable Follow admission never depends on an independently read tab. */
export function SportingInitialComposition({
  detail,
  follow,
  header,
  loading,
  children,
}: Readonly<SportingInitialCompositionProps>) {
  const { colors } = useTheme();
  const reads = follow ? [detail, follow] : [detail];
  const unresolved = reads.filter(
    (read) => read.data === undefined || hasReadError(read),
  );
  const [retrying, setRetrying] = useState(false);
  const blocked = unresolved.length > 0;
  const fetching = unresolved.some((read) => read.isFetching);
  const failed = unresolved.some(hasReadError);

  /** Rereads unresolved inputs; Query joins pending or paused attempts and owns their actual fetch progress. */
  async function retry() {
    setRetrying(true);
    try {
      await Promise.all(
        unresolved.map((read) => read.refetch({ cancelRefetch: false })),
      );
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Page fullBleed>
      <View
        style={[styles.content, blocked && styles.hidden]}
        pointerEvents={blocked ? "none" : "auto"}
        accessibilityElementsHidden={blocked}
        importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
      >
        {children}
      </View>
      {blocked && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas }]}
        >
          <PageViewport header={header}>
            <PageScrollView>
              {failed || retrying ? (
                <ScreenState>
                  <ErrorState
                    onRetry={() => void retry()}
                    retrying={retrying && fetching}
                  />
                </ScreenState>
              ) : fetching ? (
                <PageContent>{loading}</PageContent>
              ) : null}
            </PageScrollView>
          </PageViewport>
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  hidden: { opacity: 0 },
});
