const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  for (const name of [
    "APP_VARIANT",
    "EXPO_PROJECT_SLUG",
    "EXPO_PROJECT_ID",
    "FCM_GOOGLE_SERVICES_FILE",
    "REVENUECAT_TEST_STORE_API_KEY",
    "REVENUECAT_IOS_API_KEY",
    "REVENUECAT_ANDROID_API_KEY",
    "REVENUECAT_V2_OFFERING_ID",
    "REVENUECAT_SUPPORT_ACTION_ID",
    "ADMOB_IOS_APP_ID",
    "ADMOB_ANDROID_APP_ID",
    "ADMOB_V2_IOS_INTERSTITIAL_UNIT_ID",
    "ADMOB_V2_ANDROID_INTERSTITIAL_UNIT_ID",
  ]) {
    delete process.env[name];
  }
  jest.resetModules();
});

afterEach(() => {
  process.env = originalEnv;
});

it("provides French photo-library purpose text without enabling camera or microphone access", () => {
  // Given: Blockout owns the permission explanation; the system owns its presentation.

  // When
  const { default: config } =
    jest.requireActual<typeof import("../app.config")>("../app.config");

  // Then
  expect(config.plugins).toContainEqual([
    "expo-image-picker",
    {
      photosPermission:
        "Blockout accède à vos photos pour vous permettre de choisir une image.",
      cameraPermission: false,
      microphonePermission: false,
    },
  ]);
});

it("uses Google sample app IDs with delayed measurement and no configured V2 ad units", () => {
  // Given: no advertising inputs.

  // When
  const { default: config } =
    jest.requireActual<typeof import("../app.config")>("../app.config");

  // Then
  expect(config.plugins).toContainEqual([
    "react-native-google-mobile-ads",
    expect.objectContaining({
      iosAppId: "ca-app-pub-3940256099942544~1458002511",
      androidAppId: "ca-app-pub-3940256099942544~3347511713",
      delayAppMeasurementInit: true,
    }),
  ]);
  expect(config.extra?.advertising).toEqual({
    iosInterstitialUnitId: undefined,
    androidInterstitialUnitId: undefined,
  });
});

it("selects explicit public app and V2 unit IDs independently for each platform", () => {
  // Given: synthetic deployment inputs, never provider credentials or V1 fallbacks.
  process.env.ADMOB_IOS_APP_ID = "ca-app-pub-0000000000000000~0000000001";
  process.env.ADMOB_ANDROID_APP_ID = "ca-app-pub-0000000000000000~0000000002";
  process.env.ADMOB_V2_IOS_INTERSTITIAL_UNIT_ID =
    "ca-app-pub-0000000000000000/0000000003";
  process.env.ADMOB_V2_ANDROID_INTERSTITIAL_UNIT_ID =
    "ca-app-pub-0000000000000000/0000000004";

  // When
  const { default: config } =
    jest.requireActual<typeof import("../app.config")>("../app.config");

  // Then
  expect(config.plugins).toContainEqual([
    "react-native-google-mobile-ads",
    expect.objectContaining({
      iosAppId: "ca-app-pub-0000000000000000~0000000001",
      androidAppId: "ca-app-pub-0000000000000000~0000000002",
      delayAppMeasurementInit: true,
    }),
  ]);
  expect(config.extra?.advertising).toEqual({
    iosInterstitialUnitId: "ca-app-pub-0000000000000000/0000000003",
    androidInterstitialUnitId: "ca-app-pub-0000000000000000/0000000004",
  });
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

it.each(["local", "development", "preview", "production"])(
  "requires Android 10 through native build properties in %s",
  (variant) => {
    // Given: the same supported OS floor applies to every installable variant.
    if (variant !== "local") {
      process.env.APP_VARIANT = variant;
      process.env.EXPO_PROJECT_SLUG = "synthetic-project";
    }

    // When
    const { default: config } =
      jest.requireActual<typeof import("../app.config")>("../app.config");

    // Then
    expect(config.plugins).toContainEqual([
      "expo-build-properties",
      expect.objectContaining({
        android: expect.objectContaining({ minSdkVersion: 29 }),
      }),
    ]);
  },
);

it("configures isolated push inputs without a secret or background task", () => {
  // Given
  process.env.EXPO_PROJECT_ID = "00000000-0000-4000-8000-000000000001";
  process.env.FCM_GOOGLE_SERVICES_FILE =
    "/private/synthetic/google-services.json";

  // When
  const { default: config } =
    jest.requireActual<typeof import("../app.config")>("../app.config");

  // Then
  expect(config.extra?.eas?.projectId).toBe(process.env.EXPO_PROJECT_ID);
  expect(config.android?.googleServicesFile).toBe(
    process.env.FCM_GOOGLE_SERVICES_FILE,
  );
  expect(config.plugins).toContainEqual([
    "expo-notifications",
    { defaultChannel: "default", enableBackgroundRemoteNotifications: false },
  ]);
});
