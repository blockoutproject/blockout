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
      hasValidCredentials: jest.fn().mockResolvedValue(false),
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

it.each([false, true])(
  "initializes an installation with retained credentials=%s",
  async (retainedCredentials) => {
    // Given
    let canResume = retainedCredentials;
    jest
      .mocked(auth0.credentialsManager.clearCredentials)
      .mockImplementation(async () => {
        canResume = false;
      });
    jest
      .mocked(auth0.credentialsManager.hasValidCredentials)
      .mockImplementation(async () => canResume);
    await AsyncStorage.setItem("blockout:onboarding-complete", "true");

    // When
    await initializeV2Installation(auth0);

    // Then
    expect(auth0.credentialsManager.clearCredentials).toHaveBeenCalledTimes(1);
    expect(canResume).toBe(false);
    expect(await AsyncStorage.getItem(marker)).toBe("true");
    expect(await AsyncStorage.getItem("blockout:onboarding-complete")).toBe(
      "true",
    );
  },
);

it("preserves normal credentials after completed V2 initialization", async () => {
  // Given
  await AsyncStorage.setItem(marker, "true");
  jest
    .mocked(auth0.credentialsManager.hasValidCredentials)
    .mockResolvedValue(true);

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

it("resolves only after the marker is persisted", async () => {
  // Given
  const writing = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  let persisted = false;
  jest.spyOn(AsyncStorage, "setItem").mockImplementationOnce(async () => {
    started.resolve();
    await writing.promise;
    persisted = true;
  });

  // When
  const initialization = initializeV2Installation(auth0).then(() => persisted);
  await started.promise;

  // Then
  expect(persisted).toBe(false);
  writing.resolve();
  expect(await initialization).toBe(true);
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

it("refuses completion when the SDK still has resumable credentials", async () => {
  // Given
  jest
    .mocked(auth0.credentialsManager.hasValidCredentials)
    .mockResolvedValueOnce(true);

  // When
  const initialization = initializeV2Installation(auth0);

  // Then
  await expect(initialization).rejects.toThrow("Previous credentials remain");
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
