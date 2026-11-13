import { getNotificationKeys } from "../api/notification-keys";

const a = "00000000-0000-4000-8000-000000000237";
const b = "00000000-0000-4000-8000-000000000238";

it("uses generated account resource keys inside the identity-owned private cache", () => {
  // Given
  const owner = { subject: "auth0|owner", accountId: a };

  // When
  const keys = getNotificationKeys(owner);

  // Then
  expect(() =>
    getNotificationKeys({ subject: null, accountId: null }),
  ).toThrow();
  expect(keys.inbox).toEqual([`/accounts/${a}/notifications`]);
  expect(getNotificationKeys({ ...owner, accountId: b }).inbox).not.toEqual(
    keys.inbox,
  );
});
