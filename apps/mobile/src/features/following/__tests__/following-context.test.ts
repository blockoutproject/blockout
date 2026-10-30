import {
  captureFollowingOwner,
  followStateKey,
  followListKey,
  personalCalendarKey,
  followerCountKey,
} from "../api/following-keys";
const accountId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const owner = { subject: "auth0|a", accountId };

it("leaves guests and unavailable accounts without a private follow context", () => {
  // Given
  const session = { subject: null, accountId: null };
  // When / Then
  expect(captureFollowingOwner(session)).toBeNull();
});

it("captures the original business account independently of a later input change", () => {
  // Given
  const input = { ...owner };
  // When
  const captured = captureFollowingOwner(input);
  input.accountId = otherId;
  // Then
  expect(captured).toEqual(owner);
});

it("separates follow resources by original account, target type and target UUID", () => {
  // Given
  const target = { type: "team", id: otherId } as const;
  // When
  const key = followStateKey(owner, target);
  // Then
  expect(key).not.toEqual(
    followStateKey({ ...owner, accountId: otherId }, target),
  );
  expect(key).not.toEqual(followStateKey(owner, { ...target, type: "pool" }));
  expect(key).not.toEqual(followStateKey(owner, { ...target, id: accountId }));
});

it("separates list, calendar selection and public count admission inputs", () => {
  // Given
  const selection = {
    seasonId: accountId,
    category: "upcoming",
    timeZone: "Europe/Paris",
  } as const;
  const target = { type: "team", id: otherId } as const;
  // When / Then
  expect(followListKey(owner, "team", { seasonId: accountId })).not.toEqual(
    followListKey(owner, "team", { seasonId: otherId }),
  );
  expect(personalCalendarKey(owner, selection)).not.toEqual(
    personalCalendarKey(owner, { ...selection, timeZone: "UTC" }),
  );
  expect(personalCalendarKey(owner, selection)).not.toEqual(
    personalCalendarKey(owner, { ...selection, category: "completed" }),
  );
  expect(followerCountKey(target)).not.toEqual(followerCountKey(target, owner));
});
