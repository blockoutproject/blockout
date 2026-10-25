import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAgeDeclarationStatus,
  getAdvertisingAgeCategory,
  readAgeDeclaration,
  submitAgeDeclaration,
} from "../age-declaration";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

it.each([
  [0, "under16"],
  [15, "under16"],
  [16, "16–17"],
  [17, "16–17"],
  [18, "adult"],
  [100, "adult"],
])(
  "persists only the category/date for explicit age %s",
  async (age, category) => {
    // Given
    const localDate = new Date(2026, 9, 25, 0, 30);

    // When
    const declaration = await submitAgeDeclaration(age, localDate);

    // Then
    expect(declaration).toEqual({ category, declaredAt: "2026-10-25" });
    expect(await readAgeDeclaration()).toEqual(declaration);
    expect(await AsyncStorage.getAllKeys()).toEqual([
      "blockout:advertising-age",
    ]);
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("blockout:advertising-age")) ?? "null",
      ),
    ).toEqual(declaration);
  },
);

it.each([-1, 101, 15.5, NaN, Infinity])(
  "rejects invalid age %s without replacing the declaration",
  async (age) => {
    // Given
    const previous = await submitAgeDeclaration(18);

    // When / Then
    await expect(submitAgeDeclaration(age)).rejects.toThrow();
    expect(await readAgeDeclaration()).toEqual(previous);
  },
);

it.each([
  null,
  "not JSON",
  "null",
  "{}",
  '{"category":"teen","declaredAt":"2026-10-25"}',
  '{"category":"adult","declaredAt":"2026-02-30"}',
  '{"category":"adult","declaredAt":"2026-10-25","age":24}',
])(
  "uses child protection without synthesizing a declaration from %s",
  async (raw) => {
    // Given
    if (raw !== null)
      await AsyncStorage.setItem("blockout:advertising-age", raw);

    // When
    const declaration = await readAgeDeclaration();

    // Then
    expect(declaration).toBeNull();
    expect(getAdvertisingAgeCategory(declaration, new Date(2026, 9, 25))).toBe(
      "under16",
    );
    expect(await AsyncStorage.getItem("blockout:advertising-age")).toBe(raw);
  },
);

it.each([
  ["2026-10-24", "current"],
  ["2026-10-25", "expired"],
  ["2026-10-26", "expired"],
])(
  "renews a minor at the calendar anniversary on %s without aging the category",
  (today, status) => {
    // Given
    const declaration = {
      category: "16–17",
      declaredAt: "2025-10-25",
    } as const;
    const launch = new Date(`${today}T12:00:00`);

    // When / Then
    expect(getAgeDeclarationStatus(declaration, launch)).toBe(status);
    expect(getAdvertisingAgeCategory(declaration, launch)).toBe(
      status === "current" ? "16–17" : "under16",
    );
    expect(declaration.category).toBe("16–17");
  },
);

it("uses the last February day for a leap-day minor anniversary", () => {
  // Given
  const declaration = {
    category: "under16",
    declaredAt: "2024-02-29",
  } as const;

  // When / Then
  expect(getAgeDeclarationStatus(declaration, new Date(2025, 1, 27))).toBe(
    "current",
  );
  expect(getAgeDeclarationStatus(declaration, new Date(2025, 1, 28))).toBe(
    "expired",
  );
});

it("never annually reprompts adults and rejects a future declaration date", () => {
  // Given
  const adult = { category: "adult", declaredAt: "2000-01-01" } as const;
  const future = { ...adult, declaredAt: "2027-01-01" };

  // When / Then
  expect(getAgeDeclarationStatus(adult, new Date(2026, 9, 25))).toBe("current");
  expect(getAdvertisingAgeCategory(future, new Date(2026, 9, 25))).toBe(
    "under16",
  );
});

it("propagates storage failures without fictional confirmation or replacement", async () => {
  // Given
  const previous = await submitAgeDeclaration(17);
  jest
    .spyOn(AsyncStorage, "setItem")
    .mockRejectedValueOnce(new Error("Storage"));

  // When / Then
  await expect(submitAgeDeclaration(18)).rejects.toThrow("Storage");
  expect(await readAgeDeclaration()).toEqual(previous);
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockRejectedValueOnce(new Error("Storage"));
  await expect(readAgeDeclaration()).rejects.toThrow("Storage");
});
