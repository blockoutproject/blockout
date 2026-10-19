import {
  focusManager,
  MutationObserver,
  onlineManager,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { FollowerCountResponse } from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../query-client";

// Real Query observers use schema-validated responses; only the request is controlled.
const retained = FollowerCountResponse.parse({ count: 3 });
const refreshed = FollowerCountResponse.parse({ count: 4 });
const queryKey = ["controlled-follower-count"];
let client: QueryClient;
let observer: QueryObserver<FollowerCountResponse> | undefined;

beforeEach(() => {
  jest.useFakeTimers();
  onlineManager.setOnline(true);
  focusManager.setFocused(true);
  client = createQueryClient();
  client.mount();
});

afterEach(async () => {
  observer?.destroy();
  observer = undefined;
  client.unmount();
  client.clear();
  onlineManager.setOnline(true);
  focusManager.setFocused(undefined);
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
});

it("fails an offline read without queueing it, then allows an explicit retry", async () => {
  // Given
  onlineManager.setOnline(false);
  const failure = new Error("Network unavailable");
  const read = jest
    .fn<Promise<FollowerCountResponse>, []>()
    .mockRejectedValueOnce(failure)
    .mockResolvedValue(refreshed);
  observer = new QueryObserver<FollowerCountResponse>(client, {
    queryKey,
    queryFn: read,
  });

  // When
  observer.subscribe(() => {});
  await jest.advanceTimersByTimeAsync(0);

  // Then
  expect(read).toHaveBeenCalledTimes(1);
  expect(observer.getCurrentResult()).toMatchObject({
    status: "error",
    fetchStatus: "idle",
    data: undefined,
    error: failure,
  });

  // When
  onlineManager.setOnline(true);
  await jest.advanceTimersByTimeAsync(10_000);

  // Then
  expect(read).toHaveBeenCalledTimes(1);
  expect(observer.getCurrentResult().status).toBe("error");

  // When
  const result = await observer.refetch();

  // Then
  expect(read).toHaveBeenCalledTimes(2);
  expect(result).toMatchObject({ status: "success", data: refreshed });
});

it.each([false, true])(
  "does not replay a failed write (online: %s)",
  async (online) => {
    // Given
    onlineManager.setOnline(online);
    const failure = new Error("Write outcome unknown");
    const write = jest
      .fn<Promise<void>, [{ followed: boolean }]>()
      .mockRejectedValue(failure);
    const mutation = new MutationObserver(client, { mutationFn: write });

    // When
    const attempt = mutation
      .mutate({ followed: true })
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(0);

    // Then
    expect(write).toHaveBeenCalledTimes(1);
    expect(mutation.getCurrentResult()).toMatchObject({
      status: "error",
      isPaused: false,
      data: undefined,
      error: failure,
    });
    await expect(attempt).resolves.toBe(failure);

    // When
    onlineManager.setOnline(false);
    focusManager.setFocused(false);
    onlineManager.setOnline(true);
    focusManager.setFocused(true);
    await jest.advanceTimersByTimeAsync(10_000);

    // Then
    expect(write).toHaveBeenCalledTimes(1);
    expect(mutation.getCurrentResult().status).toBe("error");
  },
);

it.each(["reconnect", "focus"])(
  "keeps stale data without an implicit %s refresh",
  async (trigger) => {
    // Given
    const read = jest
      .fn<Promise<FollowerCountResponse>, []>()
      .mockResolvedValue(retained);
    observer = new QueryObserver<FollowerCountResponse>(client, {
      queryKey,
      queryFn: read,
    });
    observer.subscribe(() => {});
    await jest.advanceTimersByTimeAsync(0);
    expect(observer.getCurrentResult()).toMatchObject({
      data: retained,
      isStale: true,
    });

    // When
    if (trigger === "reconnect") {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    } else {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    }
    await jest.advanceTimersByTimeAsync(0);

    // Then
    expect(read).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult()).toMatchObject({
      status: "success",
      data: retained,
    });
  },
);

it.each([false, true])(
  "retains data and its timestamp after a failed refresh (online: %s)",
  async (online) => {
    // Given
    const failure = new Error("Refresh unavailable");
    const read = jest
      .fn<Promise<FollowerCountResponse>, []>()
      .mockResolvedValueOnce(retained)
      .mockRejectedValue(failure);
    observer = new QueryObserver<FollowerCountResponse>(client, {
      queryKey,
      queryFn: read,
    });
    observer.subscribe(() => {});
    await jest.advanceTimersByTimeAsync(0);
    const dataUpdatedAt = observer.getCurrentResult().dataUpdatedAt;

    // When
    onlineManager.setOnline(online);
    const attempt = observer.refetch();
    await jest.advanceTimersByTimeAsync(10_000);

    // Then
    expect(read).toHaveBeenCalledTimes(2);
    await expect(attempt).resolves.toMatchObject({
      status: "error",
      fetchStatus: "idle",
      isRefetchError: true,
      data: retained,
      dataUpdatedAt,
      error: failure,
    });
    expect(client.getQueryData(queryKey)).toEqual(retained);

    // When
    onlineManager.setOnline(true);
    await jest.advanceTimersByTimeAsync(0);

    // Then
    expect(read).toHaveBeenCalledTimes(2);

    // Given
    read.mockResolvedValue(refreshed);

    // When
    const result = await observer.refetch();

    // Then
    expect(read).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      status: "success",
      data: refreshed,
      error: null,
    });
    expect(result.dataUpdatedAt).toBeGreaterThan(dataUpdatedAt);
  },
);

it("allows a feature-approved focus refresh only after its chosen freshness expires", async () => {
  // Given
  const read = jest
    .fn<Promise<FollowerCountResponse>, []>()
    .mockResolvedValueOnce(retained)
    .mockResolvedValue(refreshed);
  observer = new QueryObserver<FollowerCountResponse>(client, {
    queryKey,
    queryFn: read,
    staleTime: 1_000,
    refetchOnWindowFocus: true,
  });
  observer.subscribe(() => {});
  await jest.advanceTimersByTimeAsync(0);

  // When
  focusManager.setFocused(false);
  focusManager.setFocused(true);
  await jest.advanceTimersByTimeAsync(0);

  // Then
  expect(read).toHaveBeenCalledTimes(1);

  // When
  await jest.advanceTimersByTimeAsync(1_001);
  focusManager.setFocused(false);
  focusManager.setFocused(true);
  await jest.advanceTimersByTimeAsync(0);

  // Then
  expect(read).toHaveBeenCalledTimes(2);
  expect(observer.getCurrentResult()).toMatchObject({
    status: "success",
    data: refreshed,
  });
});

it.each(["success", "error"])(
  "does not implicitly retry or refresh a remounted %s query",
  async (state) => {
    // Given
    const read =
      state === "success"
        ? jest
            .fn<Promise<FollowerCountResponse>, []>()
            .mockResolvedValue(retained)
        : jest
            .fn<Promise<FollowerCountResponse>, []>()
            .mockRejectedValue(new Error("Unavailable"));
    observer = new QueryObserver<FollowerCountResponse>(client, {
      queryKey,
      queryFn: read,
    });
    observer.subscribe(() => {});
    await jest.advanceTimersByTimeAsync(10_000);
    const attempts = read.mock.calls.length;
    observer.destroy();

    // When
    observer = new QueryObserver<FollowerCountResponse>(client, {
      queryKey,
      queryFn: read,
    });
    observer.subscribe(() => {});
    await jest.advanceTimersByTimeAsync(10_000);

    // Then
    expect(read).toHaveBeenCalledTimes(attempts);
    expect(observer.getCurrentResult().status).toBe(state);
  },
);
