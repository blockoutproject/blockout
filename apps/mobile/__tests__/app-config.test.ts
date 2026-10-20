const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  for (const name of [
    "APP_VARIANT",
    "EXPO_PROJECT_SLUG",
    "REVENUECAT_TEST_STORE_API_KEY",
    "REVENUECAT_IOS_API_KEY",
    "REVENUECAT_ANDROID_API_KEY",
    "REVENUECAT_V2_OFFERING_ID",
    "REVENUECAT_SUPPORT_ACTION_ID",
  ]) {
    delete process.env[name];
  }
  jest.resetModules();
});

afterEach(() => {
  process.env = originalEnv;
});

it("keeps ordinary local builds unconfigured without inventing provider identifiers", () => {
  // Given: no RevenueCat inputs, as in the environment example.

  // When
  const { default: config } =
    jest.requireActual<typeof import("../app.config")>("../app.config");

  // Then
  expect(config.extra?.revenueCat).toEqual({
    iosApiKey: undefined,
    androidApiKey: undefined,
    offeringIdentifier: undefined,
    supportActionIdentifier: undefined,
  });
});

it.each(["development", "preview"])(
  "selects Test Store for both platforms in %s",
  (variant) => {
    // Given
    process.env.APP_VARIANT = variant;
    process.env.EXPO_PROJECT_SLUG = "synthetic-project";
    process.env.REVENUECAT_TEST_STORE_API_KEY = "test_synthetic";
    process.env.REVENUECAT_IOS_API_KEY = "appl_synthetic";
    process.env.REVENUECAT_ANDROID_API_KEY = "goog_synthetic";

    // When
    const { default: config } =
      jest.requireActual<typeof import("../app.config")>("../app.config");

    // Then
    expect(config.extra?.revenueCat).toMatchObject({
      iosApiKey: "test_synthetic",
      androidApiKey: "test_synthetic",
    });
  },
);

it.each(["preview", "production"])(
  "uses explicit platform keys and provider identifiers in %s",
  (variant) => {
    // Given
    process.env.APP_VARIANT = variant;
    process.env.EXPO_PROJECT_SLUG = "synthetic-project";
    process.env.REVENUECAT_IOS_API_KEY = "appl_synthetic";
    process.env.REVENUECAT_ANDROID_API_KEY = "goog_synthetic";
    process.env.REVENUECAT_V2_OFFERING_ID = "synthetic-v2";
    process.env.REVENUECAT_SUPPORT_ACTION_ID = "synthetic-f10";

    // When
    const { default: config } =
      jest.requireActual<typeof import("../app.config")>("../app.config");

    // Then
    expect(config.extra?.revenueCat).toEqual({
      iosApiKey: "appl_synthetic",
      androidApiKey: "goog_synthetic",
      offeringIdentifier: "synthetic-v2",
      supportActionIdentifier: "synthetic-f10",
    });
    expect(config.extra?.eas?.projectId).toBe(
      "10cdf86a-a81e-496a-bcaa-07c132678f6d",
    );
  },
);

it.each([
  "REVENUECAT_TEST_STORE_API_KEY",
  "REVENUECAT_IOS_API_KEY",
  "REVENUECAT_ANDROID_API_KEY",
])("rejects a production candidate with a Test Store key in %s", (input) => {
  // Given
  process.env.APP_VARIANT = "production";
  process.env.EXPO_PROJECT_SLUG = "synthetic-project";
  process.env[input] = "test_synthetic";

  // When
  const loadConfig = () => jest.requireActual("../app.config");

  // Then
  expect(loadConfig).toThrow(
    "Production candidates must not contain RevenueCat Test Store keys.",
  );
});
