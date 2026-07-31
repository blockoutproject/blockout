import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useAppAccessState } from "@/src/modules/app-status/hooks/use-app-access-state";

const mockRefetch = jest.fn();
let mockAppStatus = {
  data: { maintenance: true },
  isLoading: false,
  isError: false,
  refetch: mockRefetch,
};
let mockUpdateRequired = true;

jest.mock("@/src/modules/app-status/hooks/use-app-status", () => ({
  useAppStatus: () => mockAppStatus,
}));

jest.mock("@/src/modules/app-status/model/app-version", () => ({
  computeIsUpdateRequired: () => mockUpdateRequired,
  getStoreUrl: () => "https://store.example/blockout",
}));

jest.mock("@/src/modules/user/hooks/use-has-scopes", () => ({
  __esModule: true,
  default: () => ({ allowed: true, loading: false }),
}));

describe("application access state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppStatus = {
      data: { maintenance: true },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
    mockUpdateRequired = true;
  });

  it("owns derived maintenance/update state and their bypasses", async () => {
    const { result, rerender } = await renderHook(() => useAppAccessState());
    const actions = result.current.actions;

    expect(result.current.state).toMatchObject({
      isMaintenance: true,
      isUpdateRequired: true,
      canBypassMaintenance: true,
      canBypassUpdate: true,
      appUpdateUrl: "https://store.example/blockout",
    });

    await act(async () => {
      result.current.actions.bypassMaintenance();
      result.current.actions.bypassUpdate();
    });
    expect(result.current.actions).toBe(actions);
    expect(result.current.state.maintenanceBypass).toBe(true);
    expect(result.current.state.updateBypass).toBe(true);

    mockAppStatus = {
      ...mockAppStatus,
      data: { maintenance: false },
    };
    mockUpdateRequired = false;
    await rerender({});

    await waitFor(() => {
      expect(result.current.state.maintenanceBypass).toBe(false);
      expect(result.current.state.updateBypass).toBe(false);
    });
  });

  it("exposes focused refresh and explicit session reset commands", async () => {
    const { result } = await renderHook(() => useAppAccessState());

    await act(async () => {
      result.current.actions.bypassMaintenance();
      result.current.actions.bypassUpdate();
      result.current.actions.resetBypasses();
      await result.current.actions.refetchAppStatus();
    });

    expect(result.current.state.maintenanceBypass).toBe(false);
    expect(result.current.state.updateBypass).toBe(false);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
