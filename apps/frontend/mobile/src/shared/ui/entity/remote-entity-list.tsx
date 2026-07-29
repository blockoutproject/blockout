import { FlashList, type FlashListProps } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout } from "@/src/shared/theme";
import EntityListSkeleton from "@/src/shared/ui/entity/entity-list-skeleton";
import EmptyState, {
  type EmptyStateProps,
} from "@/src/shared/ui/feedback/empty-state";
import ErrorState, {
  type ErrorStateProps,
} from "@/src/shared/ui/feedback/error-state";

export type RemoteEntityListFeedback = {
  loadingTestID: string;
  error: Omit<ErrorStateProps, "onRetry">;
  empty: Omit<EmptyStateProps, "onRetry">;
};

export type RemoteEntityListProps<T> = Omit<
  FlashListProps<T>,
  | "alwaysBounceVertical"
  | "data"
  | "ListEmptyComponent"
  | "ListFooterComponent"
  | "onRefresh"
  | "refreshing"
  | "scrollEnabled"
  | "scrollEventThrottle"
  | "showsVerticalScrollIndicator"
> & {
  data: readonly T[];
  feedback: RemoteEntityListFeedback;
  footerSpacing: number;
  isError: boolean;
  isLoading: boolean;
  onRefresh: () => Promise<unknown>;
  onRetry?: () => unknown;
};

/**
 * Owns the repeated remote-state and pull-to-refresh anatomy of entity lists.
 * Feature modules continue to own their data, rows, navigation, and copy.
 */
const RemoteEntityList = <T,>({
  data,
  feedback,
  footerSpacing,
  isError,
  isLoading,
  onRefresh,
  onRetry,
  ...listProps
}: RemoteEntityListProps<T>) => {
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const handleRetry = onRetry ?? handleRefresh;
  const footer = useMemo(
    () => (
      <View
        style={{
          height: insets.bottom + layout.bottomNavigation + footerSpacing,
        }}
      />
    ),
    [footerSpacing, insets.bottom],
  );

  if (isLoading && !isRefreshing) {
    return <EntityListSkeleton testID={feedback.loadingTestID} />;
  }

  if (isError) {
    return <ErrorState {...feedback.error} onRetry={handleRetry} />;
  }

  return (
    <FlashList
      {...listProps}
      data={data}
      ListFooterComponent={footer}
      ListEmptyComponent={
        <EmptyState {...feedback.empty} onRetry={handleRetry} />
      }
      alwaysBounceVertical
      scrollEnabled={data.length > 0}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
    />
  );
};

export default RemoteEntityList;
