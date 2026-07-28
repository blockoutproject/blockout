import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { act, render, userEvent, waitFor } from "@testing-library/react-native";
import Purchases, {
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
} from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import {
  PurchasesProvider,
  usePurchases,
} from "@/src/modules/subscription/providers/purchases-provider";
import type { RevenueCatConfiguration } from "@/src/modules/subscription/providers/revenuecat-client";

let mockSessionState = {
  isAuthenticated: false,
  auth0User: null as { sub?: string } | null,
  isBootstrapped: true,
};

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    addCustomerInfoUpdateListener: jest.fn(),
    getCustomerInfo: jest.fn(),
    isAnonymous: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: {
    DEBUG: "DEBUG",
    WARN: "WARN",
  },
  PURCHASES_ERROR_CODE: {
    API_ENDPOINT_BLOCKED: "33",
    CONFIGURATION_ERROR: "23",
    INVALID_APP_USER_ID_ERROR: "14",
    INVALID_CREDENTIALS_ERROR: "11",
    LOG_OUT_ANONYMOUS_USER_ERROR: "22",
    NETWORK_ERROR: "10",
    OFFLINE_CONNECTION_ERROR: "35",
    OPERATION_ALREADY_IN_PROGRESS_ERROR: "15",
    PAYMENT_PENDING_ERROR: "20",
    PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: "5",
    PURCHASE_INVALID_ERROR: "4",
    PURCHASE_NOT_ALLOWED_ERROR: "3",
    RECEIPT_ALREADY_IN_USE_ERROR: "7",
    RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR: "13",
    STORE_PROBLEM_ERROR: "2",
  },
}));

jest.mock("react-native-purchases-ui", () => ({
  __esModule: true,
  default: {
    presentPaywallIfNeeded: jest.fn(),
  },
  PAYWALL_RESULT: {
    CANCELLED: "CANCELLED",
    ERROR: "ERROR",
    NOT_PRESENTED: "NOT_PRESENTED",
    PURCHASED: "PURCHASED",
    RESTORED: "RESTORED",
  },
}));

jest.mock("@/src/modules/session/providers/session-context", () => ({
  useSessionState: () => mockSessionState,
}));

const mockGetCustomerInfo = jest.mocked(Purchases.getCustomerInfo);
const mockIsAnonymous = jest.mocked(Purchases.isAnonymous);
const mockLogIn = jest.mocked(Purchases.logIn);
const mockLogOut = jest.mocked(Purchases.logOut);
const mockAddCustomerInfoUpdateListener = jest.mocked(
  Purchases.addCustomerInfoUpdateListener,
);
const mockRemoveCustomerInfoUpdateListener = jest.mocked(
  Purchases.removeCustomerInfoUpdateListener,
);
const mockPresentPaywallIfNeeded = jest.mocked(
  RevenueCatUI.presentPaywallIfNeeded,
);

const configured: RevenueCatConfiguration = {
  status: "configured",
  entitlementId: "Blockout Pro",
};

const unconfigured: RevenueCatConfiguration = {
  status: "unconfigured",
  errorCode: "configuration",
};

function createCustomerInfo(
  isPro: boolean,
  originalAppUserId = "$RCAnonymousID:test",
) {
  return {
    entitlements: {
      active: isPro
        ? {
            "Blockout Pro": {
              identifier: "Blockout Pro",
              isActive: true,
            },
          }
        : {},
    },
    originalAppUserId,
  } as unknown as CustomerInfo;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function PurchasesProbe() {
  const purchases = usePurchases();
  const [result, setResult] = useState("idle");

  return (
    <View>
      <Text testID="subscription-status">{purchases.status}</Text>
      <Text testID="subscription-pro">{purchases.isPro ? "pro" : "free"}</Text>
      <Text testID="subscription-hydrated">
        {purchases.isHydrated ? "hydrated" : "pending"}
      </Text>
      <Text testID="subscription-result">{result}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh subscription"
        onPress={async () => {
          const command = await purchases.refresh();
          setResult(
            command.outcome === "error"
              ? `${command.outcome}:${command.errorCode}`
              : command.outcome,
          );
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open subscription paywall"
        onPress={async () => {
          const command = await purchases.presentPaywall();
          setResult(
            command.outcome === "error"
              ? `${command.outcome}:${command.errorCode}`
              : command.outcome,
          );
        }}
      />
    </View>
  );
}

function provider(configuration: RevenueCatConfiguration) {
  return (
    <PurchasesProvider configuration={configuration}>
      <PurchasesProbe />
    </PurchasesProvider>
  );
}

describe("PurchasesProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionState = {
      isAuthenticated: false,
      auth0User: null,
      isBootstrapped: true,
    };
    mockGetCustomerInfo.mockResolvedValue(createCustomerInfo(false));
    mockIsAnonymous.mockResolvedValue(true);
    mockLogOut.mockResolvedValue(createCustomerInfo(false));
    mockPresentPaywallIfNeeded.mockResolvedValue(PAYWALL_RESULT.CANCELLED);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("hydrates the anonymous customer and removes its listener", async () => {
    const screen = await render(provider(configured));

    await waitFor(() => {
      expect(screen.getByTestId("subscription-status")).toHaveTextContent(
        "ready",
      );
    });
    expect(mockIsAnonymous).toHaveBeenCalledTimes(1);
    expect(mockGetCustomerInfo).toHaveBeenCalledTimes(1);
    expect(mockAddCustomerInfoUpdateListener).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.unmount();
    });

    const customerInfoListener =
      mockAddCustomerInfoUpdateListener.mock.calls[0]?.[0];
    await waitFor(() => {
      expect(mockRemoveCustomerInfoUpdateListener).toHaveBeenCalledWith(
        customerInfoListener,
      );
    });
  });

  it("fails explicitly when configuration is unavailable", async () => {
    const user = userEvent.setup();
    const screen = await render(provider(unconfigured));

    expect(screen.getByTestId("subscription-status")).toHaveTextContent(
      "unconfigured",
    );
    expect(screen.getByTestId("subscription-hydrated")).toHaveTextContent(
      "hydrated",
    );
    expect(mockGetCustomerInfo).not.toHaveBeenCalled();

    await user.press(
      screen.getByRole("button", {
        name: "Open subscription paywall",
      }),
    );

    expect(screen.getByTestId("subscription-result")).toHaveTextContent(
      "error:configuration",
    );
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it("serializes account switches and ignores an older identity result", async () => {
    const firstLogin = deferred<{
      customerInfo: CustomerInfo;
      created: boolean;
    }>();
    const secondLogin = deferred<{
      customerInfo: CustomerInfo;
      created: boolean;
    }>();
    mockLogIn
      .mockReturnValueOnce(firstLogin.promise)
      .mockReturnValueOnce(secondLogin.promise);
    mockSessionState = {
      isAuthenticated: true,
      auth0User: { sub: "auth0|first" },
      isBootstrapped: true,
    };

    const screen = await render(provider(configured));
    await waitFor(() => {
      expect(mockLogIn).toHaveBeenCalledWith("auth0|first");
    });

    mockSessionState = {
      isAuthenticated: true,
      auth0User: { sub: "auth0|second" },
      isBootstrapped: true,
    };
    await screen.rerender(provider(configured));

    await act(async () => {
      firstLogin.resolve({
        customerInfo: createCustomerInfo(true, "auth0|first"),
        created: false,
      });
    });

    await waitFor(() => {
      expect(mockLogIn).toHaveBeenCalledWith("auth0|second");
    });
    expect(screen.getByTestId("subscription-pro")).toHaveTextContent("free");

    await act(async () => {
      secondLogin.resolve({
        customerInfo: createCustomerInfo(false, "auth0|second"),
        created: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("subscription-status")).toHaveTextContent(
        "ready",
      );
    });
    expect(screen.getByTestId("subscription-pro")).toHaveTextContent("free");
  });

  it("logs out to a fresh anonymous customer without leaking Pro access", async () => {
    mockSessionState = {
      isAuthenticated: true,
      auth0User: { sub: "auth0|subscriber" },
      isBootstrapped: true,
    };
    mockLogIn.mockResolvedValue({
      customerInfo: createCustomerInfo(true, "auth0|subscriber"),
      created: false,
    });

    const screen = await render(provider(configured));
    await waitFor(() => {
      expect(screen.getByTestId("subscription-pro")).toHaveTextContent("pro");
    });

    mockIsAnonymous.mockResolvedValue(false);
    mockLogOut.mockResolvedValue(createCustomerInfo(false));
    mockSessionState = {
      isAuthenticated: false,
      auth0User: null,
      isBootstrapped: true,
    };
    await screen.rerender(provider(configured));

    await waitFor(() => {
      expect(mockLogOut).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("subscription-pro")).toHaveTextContent("free");
    });
  });

  it("treats listener payloads as refresh triggers for the current identity", async () => {
    const screen = await render(provider(configured));
    await waitFor(() => {
      expect(screen.getByTestId("subscription-status")).toHaveTextContent(
        "ready",
      );
    });

    mockGetCustomerInfo.mockResolvedValueOnce(createCustomerInfo(true));
    const customerInfoListener =
      mockAddCustomerInfoUpdateListener.mock.calls[0]?.[0];
    await act(async () => {
      customerInfoListener?.(createCustomerInfo(false));
    });

    await waitFor(() => {
      expect(screen.getByTestId("subscription-pro")).toHaveTextContent("pro");
    });
  });

  it("keeps SDK-cached access when an offline refresh fails", async () => {
    const user = userEvent.setup();
    mockGetCustomerInfo.mockResolvedValueOnce(createCustomerInfo(true));
    const screen = await render(provider(configured));
    await waitFor(() => {
      expect(screen.getByTestId("subscription-pro")).toHaveTextContent("pro");
    });

    mockGetCustomerInfo.mockRejectedValueOnce({
      code: PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR,
    });
    await user.press(
      screen.getByRole("button", { name: "Refresh subscription" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("subscription-status")).toHaveTextContent(
        "stale-cache",
      );
      expect(screen.getByTestId("subscription-result")).toHaveTextContent(
        "error:network",
      );
    });
    expect(screen.getByTestId("subscription-pro")).toHaveTextContent("pro");
  });

  it.each([
    [PAYWALL_RESULT.CANCELLED, "cancelled"],
    [PAYWALL_RESULT.NOT_PRESENTED, "not-presented"],
    [PAYWALL_RESULT.ERROR, "error:unknown"],
  ])("handles paywall result %s", async (paywallResult, expected) => {
    const user = userEvent.setup();
    mockPresentPaywallIfNeeded.mockResolvedValue(paywallResult);
    const screen = await render(provider(configured));
    await waitFor(() => {
      expect(screen.getByTestId("subscription-status")).toHaveTextContent(
        "ready",
      );
    });

    await user.press(
      screen.getByRole("button", {
        name: "Open subscription paywall",
      }),
    );

    expect(screen.getByTestId("subscription-result")).toHaveTextContent(
      expected,
    );
  });

  it.each([
    [PAYWALL_RESULT.PURCHASED, "purchased"],
    [PAYWALL_RESULT.RESTORED, "restored"],
  ])(
    "refreshes entitlement after paywall result %s",
    async (paywallResult, expected) => {
      const user = userEvent.setup();
      mockPresentPaywallIfNeeded.mockResolvedValue(paywallResult);
      const screen = await render(provider(configured));
      await waitFor(() => {
        expect(screen.getByTestId("subscription-status")).toHaveTextContent(
          "ready",
        );
      });

      mockGetCustomerInfo.mockResolvedValueOnce(createCustomerInfo(true));
      await user.press(
        screen.getByRole("button", {
          name: "Open subscription paywall",
        }),
      );

      await waitFor(() => {
        expect(screen.getByTestId("subscription-result")).toHaveTextContent(
          expected,
        );
        expect(screen.getByTestId("subscription-pro")).toHaveTextContent("pro");
      });
    },
  );

  it("reports a successful restore with no active entitlement", async () => {
    const user = userEvent.setup();
    mockPresentPaywallIfNeeded.mockResolvedValue(PAYWALL_RESULT.RESTORED);
    const screen = await render(provider(configured));
    await waitFor(() => {
      expect(screen.getByTestId("subscription-status")).toHaveTextContent(
        "ready",
      );
    });

    mockGetCustomerInfo.mockResolvedValueOnce(createCustomerInfo(false));
    await user.press(
      screen.getByRole("button", {
        name: "Open subscription paywall",
      }),
    );

    expect(screen.getByTestId("subscription-result")).toHaveTextContent(
      "error:no-entitlement",
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Blockout Pro",
      expect.stringContaining("Aucun abonnement"),
    );
  });

  it("translates a rejected paywall operation to a stable network error", async () => {
    const user = userEvent.setup();
    mockPresentPaywallIfNeeded.mockRejectedValue({
      code: PURCHASES_ERROR_CODE.NETWORK_ERROR,
      message: "private provider details",
    });
    const screen = await render(provider(configured));
    await waitFor(() => {
      expect(screen.getByTestId("subscription-status")).toHaveTextContent(
        "ready",
      );
    });

    await user.press(
      screen.getByRole("button", {
        name: "Open subscription paywall",
      }),
    );

    expect(screen.getByTestId("subscription-result")).toHaveTextContent(
      "error:network",
    );
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      "[RevenueCat] operation failed",
      expect.objectContaining({
        operation: "paywall",
        code: "network",
      }),
    );
    expect(
      JSON.stringify((console.warn as jest.Mock).mock.calls),
    ).not.toContain("private provider details");
  });
});
