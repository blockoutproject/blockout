import {
  getMaintenanceSettings,
  changeMaintenanceSettings,
  getApplicationVersionSettings,
  changeApplicationVersionSettings,
} from "../../../../.generated/mobile";

// Only native networking is replaced; generated requests and decoding use the real Spring provider.
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    jest.requireActual("node-fetch")(url, options),
}));

const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const provider = process.env.BLOCKOUT_ACCESS_PROVIDER_URL;
const editor = {
  headers: {
    Authorization: `Bearer ${process.env.BLOCKOUT_ACCESS_EDITOR_TOKEN ?? ""}`,
  },
};
const suite = provider ? describe : describe.skip;

suite("configured provider and generated client wire integration", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = provider;
  });

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it("preserves omitted fields and decodes explicit null removals for both PATCH models", async () => {
    // Given
    const prepared = await changeMaintenanceSettings(
      {
        message: "Prepared wire content",
        imageUrl: "https://assets.example.invalid/maintenance.png",
      },
      editor,
    );
    await changeApplicationVersionSettings(
      {
        ios: {
          minimumVersion: "2.10.0",
          storeUrl: "https://apps.apple.com/fr/app/blockout/id123",
        },
        android: {
          minimumVersion: "2.9.0",
          storeUrl:
            "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
        },
        message: "Prepared update copy",
      },
      editor,
    );

    // When
    const retainedImage = await changeMaintenanceSettings(
      { message: "Updated wire content" },
      editor,
    );
    const removedImage = await changeMaintenanceSettings(
      { imageUrl: null },
      editor,
    );
    const removedMinimum = await changeApplicationVersionSettings(
      {
        ios: { minimumVersion: null },
        message: null,
      },
      editor,
    );

    // Then
    expect(retainedImage).toStrictEqual({
      active: prepared.active,
      message: "Updated wire content",
      imageUrl: "https://assets.example.invalid/maintenance.png",
    });
    expect(removedImage).toStrictEqual({
      active: prepared.active,
      message: "Updated wire content",
      imageUrl: null,
    });
    expect(await getMaintenanceSettings(editor)).toStrictEqual(removedImage);
    expect(removedMinimum).toStrictEqual({
      ios: {
        minimumVersion: null,
        storeUrl: "https://apps.apple.com/fr/app/blockout/id123",
      },
      android: {
        minimumVersion: "2.9.0",
        storeUrl:
          "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
      },
      message: null,
    });
    expect(await getApplicationVersionSettings(editor)).toStrictEqual(
      removedMinimum,
    );
  });

  it("applies an older valid draft against current settings without changing omitted fields", async () => {
    // Given
    const draft = { message: "Older draft content" };
    await changeMaintenanceSettings(
      {
        message: "Newer content",
        imageUrl: "https://assets.example.invalid/current.png",
      },
      editor,
    );

    // When
    const accepted = await changeMaintenanceSettings(draft, editor);

    // Then
    expect(accepted.message).toBe("Older draft content");
    expect(accepted.imageUrl).toBe(
      "https://assets.example.invalid/current.png",
    );
    expect(await getMaintenanceSettings(editor)).toStrictEqual(accepted);
  });
});
