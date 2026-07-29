import { useCallback, useEffect, useState } from "react";
import * as Haptics from "expo-haptics";

import { AppStatusResponse } from "@/src/shared/generated/models";
import { useApis } from "@/src/shared/providers/api-provider";

type UseAppVersionControlOptions = {
  appStatus?: AppStatusResponse;
  refetchStatus: () => Promise<unknown>;
  onStart: () => void;
  onError: (message: string) => void;
};

export const useAppVersionControl = ({
  appStatus,
  refetchStatus,
  onStart,
  onError,
}: UseAppVersionControlOptions) => {
  const { mobile } = useApis();
  const [minVersionIos, setMinVersionIos] = useState("");
  const [minVersionAndroid, setMinVersionAndroid] = useState("");
  const [forceUpdateMessage, setForceUpdateMessage] = useState("");
  const [storeUrlIos, setStoreUrlIos] = useState("");
  const [storeUrlAndroid, setStoreUrlAndroid] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!appStatus) return;

    setMinVersionIos(appStatus.minVersionIos ?? "");
    setMinVersionAndroid(appStatus.minVersionAndroid ?? "");
    setForceUpdateMessage(appStatus.forceUpdateMessage ?? "");
    setStoreUrlIos(appStatus.storeUrlIos ?? "");
    setStoreUrlAndroid(appStatus.storeUrlAndroid ?? "");
  }, [appStatus]);

  const isDirty =
    minVersionIos !== (appStatus?.minVersionIos ?? "") ||
    minVersionAndroid !== (appStatus?.minVersionAndroid ?? "") ||
    forceUpdateMessage !== (appStatus?.forceUpdateMessage ?? "") ||
    storeUrlIos !== (appStatus?.storeUrlIos ?? "") ||
    storeUrlAndroid !== (appStatus?.storeUrlAndroid ?? "");

  const save = useCallback(async () => {
    if (saving) return;

    const trimmedIos = minVersionIos.trim();
    const trimmedAndroid = minVersionAndroid.trim();
    const trimmedMessage = forceUpdateMessage.trim();
    const trimmedStoreIos = storeUrlIos.trim();
    const trimmedStoreAndroid = storeUrlAndroid.trim();

    try {
      onStart();
      setSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await mobile.appStatus.updateAppStatus({
        minVersionIos: trimmedIos.length ? trimmedIos : null,
        minVersionAndroid: trimmedAndroid.length ? trimmedAndroid : null,
        forceUpdateMessage: trimmedMessage.length ? trimmedMessage : null,
        storeUrlIos: trimmedStoreIos.length ? trimmedStoreIos : null,
        storeUrlAndroid: trimmedStoreAndroid.length
          ? trimmedStoreAndroid
          : null,
      });
      await refetchStatus();
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    } catch {
      onError("Mise à jour des versions minimales impossible, réessaie.");
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
    } finally {
      setSaving(false);
    }
  }, [
    forceUpdateMessage,
    minVersionAndroid,
    minVersionIos,
    mobile,
    onError,
    onStart,
    refetchStatus,
    saving,
    storeUrlAndroid,
    storeUrlIos,
  ]);

  return {
    minVersionIos,
    minVersionAndroid,
    forceUpdateMessage,
    storeUrlIos,
    storeUrlAndroid,
    saving,
    isDirty,
    setMinVersionIos,
    setMinVersionAndroid,
    setForceUpdateMessage,
    setStoreUrlIos,
    setStoreUrlAndroid,
    save,
  };
};
