import { useCallback, useEffect, useState } from "react";
import * as Haptics from "expo-haptics";

import { AppStatusResponse } from "@/src/shared/generated/models";
import { useApis } from "@/src/shared/providers/api-provider";

type UseMaintenanceControlOptions = {
  appStatus?: AppStatusResponse;
  refetchStatus: () => Promise<unknown>;
  onStart: () => void;
  onError: (message: string) => void;
};

export const useMaintenanceControl = ({
  appStatus,
  refetchStatus,
  onStart,
  onError,
}: UseMaintenanceControlOptions) => {
  const { mobile } = useApis();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!appStatus) return;

    setEnabled(appStatus.maintenance);
    setMessage(appStatus.message ?? "");
    setImageUrl(appStatus.imageUrl ?? "");
  }, [appStatus]);

  const isDirty =
    message !== (appStatus?.message ?? "") ||
    imageUrl !== (appStatus?.imageUrl ?? "");

  const save = useCallback(async () => {
    if (saving) return;

    const trimmedMessage = message.trim();
    const trimmedImageUrl = imageUrl.trim();
    if (!trimmedMessage) return;

    try {
      onStart();
      setSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await mobile.appStatus.updateAppStatus({
        maintenance: true,
        message: trimmedMessage,
        imageUrl: trimmedImageUrl.length ? trimmedImageUrl : null,
      });
      await refetchStatus();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      onError("Mise à jour de la maintenance impossible, réessaie.");
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
    } finally {
      setSaving(false);
    }
  }, [imageUrl, message, mobile, onError, onStart, refetchStatus, saving]);

  const disable = useCallback(async () => {
    if (saving) return;

    try {
      onStart();
      setSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await mobile.appStatus.updateAppStatus({
        maintenance: false,
        message: undefined,
        imageUrl: undefined,
      });
      await refetchStatus();
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    } catch {
      onError("Désactivation de la maintenance impossible, réessaie.");
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
    } finally {
      setSaving(false);
    }
  }, [mobile, onError, onStart, refetchStatus, saving]);

  return {
    enabled,
    message,
    imageUrl,
    saving,
    isDirty,
    setMessage,
    setImageUrl,
    save,
    disable,
  };
};
