import { createContext, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useIsFocused } from "expo-router";
import type { UseQueryResult } from "@tanstack/react-query";
import { Page, PageContent, PageScrollView } from "@/shared/components/page";
import { PageViewport } from "@/shared/components/navigation-backdrop";
import { ScreenState } from "@/shared/components/screen-state";
import { ErrorState } from "@/shared/components/state-card";
import { hasReadError } from "@/shared/components/read-feedback";
import { NavigationAccent } from "@/shared/components/navigation-accent";
import {
  ContentRevealContext,
  useSingleContentReveal,
} from "@/shared/components/content-reveal";

/** A season can replace the pager while the common card remains presented within the detail visit. */
export const SportingIdentityRevealContext = createContext<
  ReturnType<typeof useSingleContentReveal>["motion"] | undefined
>(undefined);

/** An existing Query result supplies indispensable data and safe read recovery, never a copied cache. */
export type SportingInitialRead = Pick<
  UseQueryResult<unknown, Error>,
  "data" | "isError" | "isPending" | "errorUpdatedAt" | "isFetching" | "refetch"
>;

function isSportingInitialReadReady(read: SportingInitialRead) {
  return read.data !== undefined && !hasReadError(read);
}

/** The public page retains its real measured scenes while one initial presentation owns unresolved inputs. */
export interface SportingInitialCompositionProps {
  initialSceneSelected: boolean;
  detail: SportingInitialRead;
  follow?: SportingInitialRead;
  canvasTint?: string;
  header: ReactNode;
  loading: ReactNode;
  children: ReactNode;
}

/** Common detail and applicable Follow admission never depends on an independently read tab. */
export function SportingInitialComposition({
  detail,
  initialSceneSelected,
  follow,
  canvasTint,
  header,
  loading,
  children,
}: Readonly<SportingInitialCompositionProps>) {
  const reads = follow ? [detail, follow] : [detail];
  const unresolved = reads.filter((read) => !isSportingInitialReadReady(read));
  const [retrying, setRetrying] = useState(false);
  const blocked = unresolved.length > 0;
  const canPresent = useIsFocused() && !blocked;
  const identityReveal = useSingleContentReveal(canPresent);
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
    <Page fullBleed canvasTint={blocked ? undefined : canvasTint}>
      <NavigationAccent color={blocked ? undefined : canvasTint} />
      <View
        style={[styles.content, blocked && styles.hidden]}
        pointerEvents={blocked ? "none" : "auto"}
        accessibilityElementsHidden={blocked}
        importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
      >
        <ContentRevealContext
          value={{
            ready: canPresent,
            precedingElapsed: initialSceneSelected
              ? identityReveal.elapsed
              : undefined,
          }}
        >
          <SportingIdentityRevealContext value={identityReveal.motion}>
            {children}
          </SportingIdentityRevealContext>
        </ContentRevealContext>
      </View>
      {blocked && (
        <View style={StyleSheet.absoluteFill}>
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
