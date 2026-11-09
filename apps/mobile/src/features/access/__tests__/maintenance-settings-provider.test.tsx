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
    const maintenance = await getMaintenanceSettings(editor);
    const prepared = await changeMaintenanceSettings(
      {
        revision: maintenance.revision,
        message: "Prepared wire content",
        imageUrl: "https://assets.example.invalid/maintenance.png",
      },
      editor,
    );
    const versions = await getApplicationVersionSettings(editor);
    const configured = await changeApplicationVersionSettings(
      {
        revision: versions.revision,
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
      { revision: prepared.revision, message: "Updated wire content" },
      editor,
    );
    const removedImage = await changeMaintenanceSettings(
      { revision: retainedImage.revision, imageUrl: null },
      editor,
    );
    const removedMinimum = await changeApplicationVersionSettings(
      {
        revision: configured.revision,
        ios: { minimumVersion: null },
        message: null,
      },
      editor,
    );

    // Then
    expect(retainedImage).toStrictEqual({
      revision: prepared.revision + 1,
      active: prepared.active,
      message: "Updated wire content",
      imageUrl: "https://assets.example.invalid/maintenance.png",
    });
    expect(removedImage).toStrictEqual({
      revision: retainedImage.revision + 1,
      active: prepared.active,
      message: "Updated wire content",
      imageUrl: null,
    });
    expect(await getMaintenanceSettings(editor)).toStrictEqual(removedImage);
    expect(removedMinimum).toStrictEqual({
      revision: configured.revision + 1,
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

  it("decodes a real stale-revision 409 Problem Detail", async () => {
    // Given
    const current = await getMaintenanceSettings(editor);
    await changeMaintenanceSettings(
      { revision: current.revision, message: "Current conflict content" },
      editor,
    );

    // When
    const staleWrite = changeMaintenanceSettings(
      { revision: current.revision, message: "Rejected stale content" },
      editor,
    );

    // Then
    await expect(staleWrite).rejects.toMatchObject({
      kind: "http",
      status: 409,
      problem: {
        type: "urn:blockout:problem:stale-revision",
        status: 409,
      },
    });
  });
});
