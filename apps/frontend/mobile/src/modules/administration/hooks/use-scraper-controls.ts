import { useCallback, useMemo } from "react";
import * as Haptics from "expo-haptics";

import { ScraperStatusResponse } from "@/src/shared/generated/models";
import { useApis } from "@/src/shared/providers/api-provider";
import { useScraperStatuses } from "./use-scraper-status";

export const useScraperControls = (
  onStart: () => void,
  onError: (message: string) => void,
) => {
  const { mobile } = useApis();
  const { data, isLoading, refetch: refetchScrapers } = useScraperStatuses();

  const scrapers = useMemo(
    () => (data ? [...data].sort((a, b) => a.name.localeCompare(b.name)) : []),
    [data],
  );

  const toggle = useCallback(
    async (scraper: ScraperStatusResponse) => {
      try {
        onStart();
        await Haptics.selectionAsync();
        await mobile.administration.updateScraperStatus(
          scraper.name,
          !scraper.enabled,
        );
        await refetchScrapers();
      } catch {
        onError("Mise à jour du scraper impossible, réessaie.");
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
    },
    [mobile, onError, onStart, refetchScrapers],
  );

  return {
    scrapers,
    hasData: data !== undefined,
    isLoading,
    refetch: refetchScrapers,
    toggle,
  };
};
