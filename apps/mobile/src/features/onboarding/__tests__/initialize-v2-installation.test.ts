import AsyncStorage from "@react-native-async-storage/async-storage";
import Auth0 from "react-native-auth0";
import { initializeV2Installation } from "../initialize-v2-installation";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-auth0", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    credentialsManager: {
      clearCredentials: jest.fn().mockResolvedValue(undefined),
    },
  })),
}));

const marker = "blockout:v2-initialized";
let auth0: Auth0;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  auth0 = new Auth0({
    domain: "identity.example.invalid",
    clientId: "mobile-test",
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("clears native credentials before completing V2 initialization", async () => {
  // Given
  await AsyncStorage.setItem("blockout:onboarding-complete", "true");

  // When
  await initializeV2Installation(auth0);

  // Then
  expect(auth0.credentialsManager.clearCredentials).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem(marker)).toBe("true");
  expect(await AsyncStorage.getItem("blockout:onboarding-complete")).toBe(
    "true",
  );
});

it("preserves normal credentials after completed V2 initialization", async () => {
  // Given
  await AsyncStorage.setItem(marker, "true");

  // When
  await initializeV2Installation(auth0);
  await initializeV2Installation(auth0);

  // Then
  expect(auth0.credentialsManager.clearCredentials).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(marker)).toBe("true");
});

it("waits for clearing before persisting completion across repeated mount attempts", async () => {
  // Given
  const clearing = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  jest
    .mocked(auth0.credentialsManager.clearCredentials)
    .mockImplementation(() => {
      started.resolve();
      return clearing.promise;
    });

  // When
  const firstMount = initializeV2Installation(auth0);
  const secondMount = initializeV2Installation(auth0);
  await started.promise;

  // Then
  expect(await AsyncStorage.getItem(marker)).toBeNull();
  expect(auth0.credentialsManager.clearCredentials).toHaveBeenCalledTimes(1);
  clearing.resolve();
  await Promise.all([firstMount, secondMount]);
  expect(await AsyncStorage.getItem(marker)).toBe("true");
});

it("propagates a failed marker read without clearing credentials", async () => {
  // Given
  const error = new Error("Storage unavailable");
  jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(error);

  // When
  const initialization = initializeV2Installation(auth0);

  // Then
  await expect(initialization).rejects.toBe(error);
  expect(auth0.credentialsManager.clearCredentials).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(marker)).toBeNull();
});

it("leaves initialization incomplete when native clearing rejects", async () => {
  // Given
  const error = new Error("Native storage unavailable");
  jest
    .mocked(auth0.credentialsManager.clearCredentials)
    .mockRejectedValueOnce(error);

  // When
  const initialization = initializeV2Installation(auth0);

  // Then
  await expect(initialization).rejects.toBe(error);
  expect(await AsyncStorage.getItem(marker)).toBeNull();
});

it("retries safely after interruption between clearing and marker persistence", async () => {
  // Given
  const error = new Error("Marker write interrupted");
  jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(error);
  await expect(initializeV2Installation(auth0)).rejects.toBe(error);
  expect(auth0.credentialsManager.clearCredentials).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem(marker)).toBeNull();

  // When
  await initializeV2Installation(auth0);

  // Then
  expect(auth0.credentialsManager.clearCredentials).toHaveBeenCalledTimes(2);
  expect(await AsyncStorage.getItem(marker)).toBe("true");
});
