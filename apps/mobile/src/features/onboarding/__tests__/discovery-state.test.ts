import AsyncStorage from "@react-native-async-storage/async-storage";
import { completeDiscovery, readDiscoveryCompletion } from "../discovery-state";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

it("leaves interrupted discovery incomplete even after V1 completion and V2 initialization", async () => {
  // Given
  await AsyncStorage.multiSet([
    ["onboardingComplete", "true"],
    ["blockout:v2-initialized", "true"],
  ]);

  // When
  const firstLaunch = await readDiscoveryCompletion();
  const interruptedLaunch = await readDiscoveryCompletion();

  // Then
  expect(firstLaunch).toBe(false);
  expect(interruptedLaunch).toBe(false);
  expect(await AsyncStorage.getAllKeys()).toHaveLength(2);
});

it("retains explicit completion across repeated launches without changing other installation choices", async () => {
  // Given
  await AsyncStorage.setItem("advertising-age", "adult");

  // When
  await completeDiscovery();
  const firstReread = await readDiscoveryCompletion();
  const subsequentReread = await readDiscoveryCompletion();

  // Then
  expect(firstReread).toBe(true);
  expect(subsequentReread).toBe(true);
  expect(await AsyncStorage.getItem("advertising-age")).toBe("adult");
  expect(await AsyncStorage.getAllKeys()).toHaveLength(2);
});

it("does not report completion after a failed write and permits explicit retry", async () => {
  // Given
  jest
    .spyOn(AsyncStorage, "setItem")
    .mockRejectedValueOnce(new Error("Storage"));

  // When / Then
  await expect(completeDiscovery()).rejects.toThrow("Storage");
  expect(await readDiscoveryCompletion()).toBe(false);

  // When
  await completeDiscovery();

  // Then
  expect(await readDiscoveryCompletion()).toBe(true);
});

it("propagates a failed read instead of assuming discovery is complete", async () => {
  // Given
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockRejectedValueOnce(new Error("Storage"));

  // When / Then
  await expect(readDiscoveryCompletion()).rejects.toThrow("Storage");
});
