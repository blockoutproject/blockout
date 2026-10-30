import { Platform } from "react-native";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { accessPresentation } from "../state/access-presentation";
import {
  installedVersionStatus,
  parsePublishedVersion,
} from "../native/installed-version";

afterEach(() => jest.restoreAllMocks());

it.each([
  ["2.9.0", "2.10.0", "outdated"],
  ["2.10.0", "2.9.0", "satisfied"],
  ["2.10.0", "2.10.0", "satisfied"],
  [null, null, "satisfied"],
  [null, "1.0.0", "unavailable"],
  ["1.0.0-beta", "1.0.0", "unavailable"],
  ["1.0.0", "bad", "unavailable"],
] as const)(
  "compares native %s against %s as %s",
  (installed, minimum, expected) => {
    // Given: the table supplies the version inputs.

    // When
    const result = installedVersionStatus(minimum, installed);

    // Then
    expect(result).toBe(expected);
  },
);

it.each([
  "1.0",
  "1.0.0.0",
  "01.0.0",
  "1.0.0+2",
  "1.0.0-beta",
  "^1.0.0",
  " 1.0.0",
  "-1.0.0",
  "1.0.9007199254740992",
  "1e2.0.0",
  "1.0.0\n",
])("rejects malformed or unsafe published version %s", (value) => {
  // Given: the table supplies the version inputs.

  // When
  const result = parsePublishedVersion(value);

  // Then
  expect(result).toBeUndefined();
});

it("accepts three safe integer components including the maximum", () => {
  // Given: the table supplies the version inputs.

  // When
  const result = parsePublishedVersion("9007199254740991.0.12");

  // Then
  expect(result).toEqual([9007199254740991, 0, 12]);
});

it.each(["ios", "android"] as const)(
  "selects only the %s native platform threshold and store",
  (platform) => {
    // Given
    jest.replaceProperty(Platform, "OS", platform);
    const full = applicationAccessResponse();
    full.versions.ios = {
      minimumVersion: "9999.0.0",
      storeUrl: "https://apps.apple.com/app/id123",
    };
    full.versions.android = {
      minimumVersion: null,
      storeUrl:
        "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
    };

    // When
    const presentation = accessPresentation({
      maintenance: full.maintenance,
      versions: full.versions,
      complete: full,
    });

    // Then
    expect(presentation.versions?.storeUrl).toBe(
      full.versions[platform].storeUrl,
    );
    expect(presentation.ordinary).toBe(platform === "android");
  },
);
