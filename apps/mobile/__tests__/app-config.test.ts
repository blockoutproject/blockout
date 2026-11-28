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
    "REVENUECAT_OFFERING_ID",
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
    ios: {},
    android: {},
  });
});

it("selects explicit public app and V2 unit IDs independently for each platform", () => {
  // Given: synthetic deployment inputs, never provider credentials or V1 fallbacks.
  process.env.APP_VARIANT = "production";
  process.env.EXPO_PROJECT_SLUG = "synthetic-project";
  process.env.ADMOB_IOS_APP_ID = " ca-app-pub-0000000000000000~0000000001 ";
  process.env.ADMOB_ANDROID_APP_ID = "ca-app-pub-0000000000000000~0000000002";
  process.env.ADMOB_V2_IOS_INTERSTITIAL_UNIT_ID =
    " ca-app-pub-0000000000000000/0000000003 ";
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
    ios: { adUnitId: "ca-app-pub-0000000000000000/0000000003" },
    android: { adUnitId: "ca-app-pub-0000000000000000/0000000004" },
  });
});

it.each([
  [
    "missing app ID and demo unit",
    undefined,
    "ca-app-pub-3940256099942544/4411468910",
  ],
  ["demo app ID and blank unit", "ca-app-pub-3940256099942544~3347511713", " "],
])(
  "keeps production UMP on the configured platform without ads for %s",
  (_case, androidAppId, iosAdUnitId) => {
    // Given: iOS has a real app ID but no production unit. Android has no real app ID.
    process.env.APP_VARIANT = "production";
    process.env.EXPO_PROJECT_SLUG = "synthetic-project";
    process.env.ADMOB_IOS_APP_ID = "ca-app-pub-0000000000000000~0000000001";
    if (androidAppId !== undefined) {
      process.env.ADMOB_ANDROID_APP_ID = androidAppId;
    }
    process.env.ADMOB_V2_IOS_INTERSTITIAL_UNIT_ID = iosAdUnitId;
    process.env.ADMOB_V2_ANDROID_INTERSTITIAL_UNIT_ID =
      "ca-app-pub-0000000000000000/0000000004";

    // When
    const { default: config } =
      jest.requireActual<typeof import("../app.config")>("../app.config");

    // Then
    expect(config.extra?.advertising).toStrictEqual({
      ios: {},
      android: undefined,
    });
  },
);

it("uses the local native identity and leaves Pro unconfigured without provider inputs", () => {
  // Given: no RevenueCat inputs, as in the environment example.

  // When
  const { default: config } =
    jest.requireActual<typeof import("../app.config")>("../app.config");

  // Then
  expect(config.ios?.bundleIdentifier).toBe(
    "com.blockoutproject.blockout.local",
  );
  expect(config.android?.package).toBe("com.blockoutproject.blockout.local");
  expect(config.scheme).toBe("blockout-local");
  expect(config.extra?.revenueCat).toEqual({
    iosApiKey: undefined,
    androidApiKey: undefined,
    offeringIdentifier: undefined,
  });
});

it.each([
  { build: "local Debug", variant: undefined },
  { build: "EAS development", variant: "development" },
  { build: "preproduction Test Store", variant: "preview-test-store" },
])("selects Test Store for both platforms in a $build build", ({ variant }) => {
  // Given
  if (variant !== undefined) {
    process.env.APP_VARIANT = variant;
    process.env.EXPO_PROJECT_SLUG = "synthetic-project";
  }
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
});

it("uses the preproduction identity with purchases unconfigured until Test Store is available", () => {
  // Given: the preproduction environment can provide platform keys for its Release client.
  process.env.APP_VARIANT = "preview-test-store";
  process.env.EXPO_PROJECT_SLUG = "synthetic-project";
  process.env.REVENUECAT_IOS_API_KEY = "appl_synthetic";
  process.env.REVENUECAT_ANDROID_API_KEY = "goog_synthetic";

  // When
  const { default: config } =
    jest.requireActual<typeof import("../app.config")>("../app.config");

  // Then
  expect(config.ios?.bundleIdentifier).toBe(
    "com.blockoutproject.blockout.preproduction",
  );
  expect(config.android?.package).toBe(
    "com.blockoutproject.blockout.preproduction",
  );
  expect(config.extra?.revenueCat).toMatchObject({
    iosApiKey: undefined,
    androidApiKey: undefined,
  });
});

it("rejects a platform key supplied as the preproduction Test Store key", () => {
  // Given
  process.env.APP_VARIANT = "preview-test-store";
  process.env.EXPO_PROJECT_SLUG = "synthetic-project";
  process.env.REVENUECAT_TEST_STORE_API_KEY = "appl_synthetic";

  // When
  const loadConfig = () => jest.requireActual("../app.config");

  // Then
  expect(loadConfig).toThrow(
    "The preview Test Store client requires a RevenueCat Test Store key.",
  );
});

it.each(["preview", "production"])(
  "uses explicit platform keys and provider identifiers in %s",
  (variant) => {
    // Given
    process.env.APP_VARIANT = variant;
    process.env.EXPO_PROJECT_SLUG = "synthetic-project";
    process.env.REVENUECAT_IOS_API_KEY = "appl_synthetic";
    process.env.REVENUECAT_ANDROID_API_KEY = "goog_synthetic";
    process.env.REVENUECAT_OFFERING_ID = "default";

    // When
    const { default: config } =
      jest.requireActual<typeof import("../app.config")>("../app.config");

    // Then
    expect(config.extra?.revenueCat).toEqual({
      iosApiKey: "appl_synthetic",
      androidApiKey: "goog_synthetic",
      offeringIdentifier: "default",
    });
    expect(config.extra?.eas?.projectId).toBe(
      "10cdf86a-a81e-496a-bcaa-07c132678f6d",
    );
  },
);

it.each([
  ["preview", "REVENUECAT_TEST_STORE_API_KEY"],
  ["preview", "REVENUECAT_IOS_API_KEY"],
  ["preview", "REVENUECAT_ANDROID_API_KEY"],
  ["production", "REVENUECAT_TEST_STORE_API_KEY"],
  ["production", "REVENUECAT_IOS_API_KEY"],
  ["production", "REVENUECAT_ANDROID_API_KEY"],
])("rejects a %s build with a Test Store key in %s", (variant, input) => {
  // Given
  process.env.APP_VARIANT = variant;
  process.env.EXPO_PROJECT_SLUG = "synthetic-project";
  process.env[input] = "test_synthetic";

  // When
  const loadConfig = () => jest.requireActual("../app.config");

  // Then
  expect(loadConfig).toThrow(
    "RevenueCat Test Store keys require a Debug build.",
  );
});

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
    {
      icon: "./assets/notification-icon.png",
      defaultChannel: "default",
      enableBackgroundRemoteNotifications: false,
    },
  ]);
});
