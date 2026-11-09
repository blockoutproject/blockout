import { accountReturnPath } from "../navigation/account-return-path";

it.each([
  { value: "/", expected: "/" },
  { value: "/profile", expected: "/profile" },
  {
    value: "/(ordinary)/matches/745?source=notification#links",
    expected: "/(ordinary)/matches/745?source=notification#links",
  },
  {
    value: "/matches/745?source=notification&name=Team%20A#links",
    expected: "/matches/745?source=notification&name=Team%20A#links",
  },
])("preserves the internal destination $value", ({ value, expected }) => {
  // Given: one internal route parameter, including its encoded query when present.

  // When
  const destination = accountReturnPath(value);

  // Then
  expect(destination).toBe(expected);
});

it.each([
  undefined,
  null,
  745,
  ["/profile"],
  ["/profile", "/matches/745"],
  "",
  "profile",
  "https://example.invalid/profile",
  "blockout://profile",
  "javascript:alert(1)",
  "//example.invalid/profile",
  "/\\example.invalid/profile",
  "/profile\\edit",
  "/\n/example.invalid/profile",
  "/sign-in",
  "/sign-in/?returnTo=%2Fprofile",
  "/matches/../sign-in",
  "/%73ign-in",
  "/(recovery)/sign-in",
  "/%28recovery%29/%73ign-in",
  "/%invalid",
])("rejects an ambiguous, external or self-return parameter %j", (value) => {
  // Given: an untrusted route parameter.

  // When
  const destination = accountReturnPath(value);

  // Then
  expect(destination).toBeUndefined();
});
