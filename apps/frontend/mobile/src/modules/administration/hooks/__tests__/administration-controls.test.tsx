import { act, renderHook, waitFor } from "@testing-library/react-native";

import { AppStatusResponse } from "@/src/shared/generated/models";
import { useAppVersionControl } from "@/src/modules/administration/hooks/use-app-version-control";
import { useMaintenanceControl } from "@/src/modules/administration/hooks/use-maintenance-control";

const mockUpdateAppStatus = jest.fn();

jest.mock("@/src/shared/providers/api-provider", () => ({
  useApis: () => ({
    mobile: {
      appStatus: {
        updateAppStatus: mockUpdateAppStatus,
      },
    },
  }),
}));

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: {
    Error: "error",
    Success: "success",
  },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

const appStatus: AppStatusResponse = {
  maintenance: false,
  message: "Maintenance initiale",
  imageUrl: "https://example.test/maintenance.png",
  minVersionIos: "1.0.0",
  minVersionAndroid: "1.1.0",
  forceUpdateMessage: "Mise à jour requise",
  storeUrlIos: "https://example.test/ios",
  storeUrlAndroid: "https://example.test/android",
};

describe("administration controls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateAppStatus.mockResolvedValue(undefined);
  });

  it("saves the edited maintenance state through the app-status boundary", async () => {
    const refetchStatus = jest.fn().mockResolvedValue(undefined);
    const onStart = jest.fn();
    const onError = jest.fn();
    const { result } = await renderHook(() =>
      useMaintenanceControl({ appStatus, refetchStatus, onStart, onError }),
    );

    await waitFor(() =>
      expect(result.current.message).toBe("Maintenance initiale"),
    );

    await act(async () => {
      result.current.setMessage("  Nouvelle maintenance  ");
      result.current.setImageUrl("  ");
    });

    await act(async () => {
      await result.current.save();
    });

    expect(mockUpdateAppStatus).toHaveBeenCalledWith({
      maintenance: true,
      message: "Nouvelle maintenance",
      imageUrl: null,
    });
    expect(refetchStatus).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a stable feature error when maintenance cannot be disabled", async () => {
    const onError = jest.fn();
    mockUpdateAppStatus.mockRejectedValue(new Error("provider detail"));
    const { result } = await renderHook(() =>
      useMaintenanceControl({
        appStatus: { ...appStatus, maintenance: true },
        refetchStatus: jest.fn(),
        onStart: jest.fn(),
        onError,
      }),
    );

    await act(async () => {
      await result.current.disable();
    });

    expect(onError).toHaveBeenCalledWith(
      "Désactivation de la maintenance impossible, réessaie.",
    );
    expect(result.current.saving).toBe(false);
  });

  it("normalizes version values before saving them", async () => {
    const refetchStatus = jest.fn().mockResolvedValue(undefined);
    const onStart = jest.fn();
    const onError = jest.fn();
    const { result } = await renderHook(() =>
      useAppVersionControl({ appStatus, refetchStatus, onStart, onError }),
    );

    await waitFor(() => expect(result.current.minVersionIos).toBe("1.0.0"));

    await act(async () => {
      result.current.setMinVersionIos(" 2.0.0 ");
      result.current.setMinVersionAndroid("");
      result.current.setForceUpdateMessage(" Nouvelle version ");
    });

    await act(async () => {
      await result.current.save();
    });

    expect(mockUpdateAppStatus).toHaveBeenCalledWith({
      minVersionIos: "2.0.0",
      minVersionAndroid: null,
      forceUpdateMessage: "Nouvelle version",
      storeUrlIos: "https://example.test/ios",
      storeUrlAndroid: "https://example.test/android",
    });
    expect(refetchStatus).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
