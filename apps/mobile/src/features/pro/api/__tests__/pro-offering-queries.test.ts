import { isCancelledError } from "@tanstack/react-query";
import { createQueryClient } from "../../../../shared/query/query-client";
import { mockPurchases } from "../../test-support/native-purchases";
import { v2Offering } from "../../test-support/offering";
import { createProOfferingQueryOptions } from "../pro-offering-queries";

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
it("cancels native offering admission while RevenueCat I/O settles", async () => {
  // Given
  const client = createQueryClient();
  const options = createProOfferingQueryOptions(
    { subject: "auth0|a", accountId: "account-a" },
    "v2",
  );
  const native =
    Promise.withResolvers<
      Awaited<ReturnType<typeof mockPurchases.getOfferings>>
    >();
  mockPurchases.getOfferings.mockReturnValueOnce(native.promise);
  const pending = client.fetchQuery(options).catch((error: unknown) => error);
  // When
  await client.cancelQueries({ queryKey: options.queryKey });
  native.resolve({ current: v2Offering, all: { v2: v2Offering } });
  // Then
  expect(isCancelledError(await pending)).toBe(true);
  expect(client.getQueryData(options.queryKey)).toBeUndefined();
  client.clear();
});
