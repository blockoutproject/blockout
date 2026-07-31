import { getRootNavigationState } from "@/src/modules/session/navigation/root-navigation-state";

const availableSession = {
  isAuthenticated: true,
  isGuest: false,
  isMaintenance: false,
  maintenanceBypass: false,
  isUpdateRequired: false,
  updateBypass: false,
  hasCompletedOnboarding: true,
};

describe("root navigation state", () => {
  it("prioritizes maintenance over update and every session route", () => {
    expect(
      getRootNavigationState({
        ...availableSession,
        isMaintenance: true,
        isUpdateRequired: true,
      }),
    ).toEqual({
      showMaintenance: true,
      showUpdateRequired: false,
      showSignIn: false,
      showOnboarding: false,
      showApplication: false,
    });
  });

  it("shows update-required when maintenance is not active", () => {
    expect(
      getRootNavigationState({
        ...availableSession,
        isUpdateRequired: true,
      }),
    ).toMatchObject({
      showMaintenance: false,
      showUpdateRequired: true,
      showApplication: false,
    });
  });

  it("routes signed-out users to sign-in", () => {
    expect(
      getRootNavigationState({
        ...availableSession,
        isAuthenticated: false,
      }),
    ).toMatchObject({
      showSignIn: true,
      showOnboarding: false,
      showApplication: false,
    });
  });

  it.each([
    ["authenticated", true, false],
    ["guest", false, true],
  ])(
    "routes an %s session through onboarding before the application",
    (_label, isAuthenticated, isGuest) => {
      const navigation = getRootNavigationState({
        ...availableSession,
        isAuthenticated,
        isGuest,
        hasCompletedOnboarding: false,
      });

      expect(navigation).toMatchObject({
        showSignIn: false,
        showOnboarding: true,
        showApplication: true,
      });
    },
  );

  it("honors maintenance and update bypasses independently", () => {
    expect(
      getRootNavigationState({
        ...availableSession,
        isMaintenance: true,
        maintenanceBypass: true,
        isUpdateRequired: true,
        updateBypass: true,
      }),
    ).toMatchObject({
      showMaintenance: false,
      showUpdateRequired: false,
      showApplication: true,
    });
  });
});
