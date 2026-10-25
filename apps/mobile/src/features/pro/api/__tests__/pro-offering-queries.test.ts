import { isCancelledError } from "@tanstack/react-query";
import { ApiError } from "../../../../shared/api/api-fetch";
import { createQueryClient } from "../../../../shared/query/query-client";
import { createSessionGeneration } from "../../../accounts/session/session-generation";
import { mockPurchases } from "../../test-support/native-purchases";
import { v2Offering } from "../../test-support/offering";
import { createProOfferingQueryOptions } from "../pro-offering-queries";

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

it.each(["cancel", "change-session"] as const)(
  "rejects an obsolete offering after %s even when native SDK I/O completes",
  async (action) => {
    // Given: Query and the session owner are real; only native RevenueCat I/O is controlled.
    const client = createQueryClient();
    const session = createSessionGeneration();
    session.setAccount(session.getSnapshot().generation, "account-a");
    const options = createProOfferingQueryOptions(
      {
        ...session.getSnapshot(),
        isCurrent: session.isCurrent,
      },
      "v2",
    );
    const native =
      Promise.withResolvers<
        Awaited<ReturnType<typeof mockPurchases.getOfferings>>
      >();
    mockPurchases.getOfferings.mockReturnValueOnce(native.promise);
    const pending = client.query(options).catch((error: unknown) => error);

    // When
    if (action === "cancel")
      await client.cancelQueries({ queryKey: options.queryKey });
    else session.invalidate();
    native.resolve({ current: v2Offering, all: { v2: v2Offering } });
    const result = await pending;

    // Then
    if (action === "cancel") expect(isCancelledError(result)).toBe(true);
    else expect(result).toEqual(new ApiError("cancelled"));
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
    client.clear();
  },
);
