import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppStatus } from "@/src/modules/app-status/hooks/use-app-status";
import {
  computeIsUpdateRequired,
  getStoreUrl,
} from "@/src/modules/app-status/model/app-version";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";

const APP_STATUS_BYPASS_SCOPES = ["update:maintenance"];

export const useAppAccessState = () => {
  const {
    data: appStatus,
    isLoading: isAppStatusLoading,
    isError: isAppStatusError,
    refetch,
  } = useAppStatus();
  const { allowed: canBypassAppStatus } = useHasScopes(
    APP_STATUS_BYPASS_SCOPES,
  );

  const [maintenanceBypass, setMaintenanceBypass] = useState(false);
  const [updateBypass, setUpdateBypass] = useState(false);

  const isMaintenance = appStatus?.maintenance === true;
  const isUpdateRequired = useMemo(
    () => computeIsUpdateRequired(appStatus),
    [appStatus],
  );
  const appUpdateUrl = useMemo(() => getStoreUrl(appStatus), [appStatus]);

  const bypassMaintenance = useCallback(() => setMaintenanceBypass(true), []);
  const resetBypassMaintenance = useCallback(
    () => setMaintenanceBypass(false),
    [],
  );
  const bypassUpdate = useCallback(() => setUpdateBypass(true), []);
  const resetBypassUpdate = useCallback(() => setUpdateBypass(false), []);
  const resetBypasses = useCallback(() => {
    setMaintenanceBypass(false);
    setUpdateBypass(false);
  }, []);
  const refetchAppStatus = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    if (!isMaintenance && maintenanceBypass) resetBypassMaintenance();
  }, [isMaintenance, maintenanceBypass, resetBypassMaintenance]);

  useEffect(() => {
    if (!isUpdateRequired && updateBypass) resetBypassUpdate();
  }, [isUpdateRequired, resetBypassUpdate, updateBypass]);

  const state = useMemo(
    () => ({
      appStatus,
      isAppStatusLoading,
      isAppStatusError,
      isMaintenance,
      maintenanceBypass,
      canBypassMaintenance: canBypassAppStatus,
      isUpdateRequired,
      updateBypass,
      canBypassUpdate: canBypassAppStatus,
      appUpdateUrl,
    }),
    [
      appStatus,
      appUpdateUrl,
      canBypassAppStatus,
      isAppStatusError,
      isAppStatusLoading,
      isMaintenance,
      isUpdateRequired,
      maintenanceBypass,
      updateBypass,
    ],
  );
  const actions = useMemo(
    () => ({
      bypassMaintenance,
      resetBypassMaintenance,
      bypassUpdate,
      resetBypassUpdate,
      resetBypasses,
      refetchAppStatus,
    }),
    [
      bypassMaintenance,
      bypassUpdate,
      refetchAppStatus,
      resetBypassMaintenance,
      resetBypassUpdate,
      resetBypasses,
    ],
  );

  return {
    state,
    actions,
  };
};
