type RootNavigationStateInput = {
  isAuthenticated: boolean;
  isGuest: boolean;
  isMaintenance: boolean;
  maintenanceBypass: boolean;
  isUpdateRequired: boolean;
  updateBypass: boolean;
  hasCompletedOnboarding: boolean;
};

export const getRootNavigationState = ({
  isAuthenticated,
  isGuest,
  isMaintenance,
  maintenanceBypass,
  isUpdateRequired,
  updateBypass,
  hasCompletedOnboarding,
}: RootNavigationStateInput) => {
  const isBlockedByMaintenance = isMaintenance && !maintenanceBypass;
  const isBlockedByUpdate = isUpdateRequired && !updateBypass;
  const isGloballyBlocked = isBlockedByMaintenance || isBlockedByUpdate;
  const hasSession = isGuest || isAuthenticated;

  return {
    showMaintenance: isBlockedByMaintenance,
    showUpdateRequired: isBlockedByUpdate && !isBlockedByMaintenance,
    showSignIn: !hasSession && !isGloballyBlocked,
    showOnboarding: hasSession && !isGloballyBlocked && !hasCompletedOnboarding,
    showApplication: hasSession && !isGloballyBlocked,
  };
};
