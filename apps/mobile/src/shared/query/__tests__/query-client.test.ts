import {
  MutationObserver,
  onlineManager,
  QueryObserver,
} from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import { ApiError } from "@/shared/api/api-fetch";
import { createQueryClient } from "../query-client";

afterEach(() => {
  onlineManager.setOnline(true);
  jest.useRealTimers();
});

it("recovers a transient read and publishes the accepted result", async () => {
  // Given: real Query lifecycle, controlled request boundary.
  const client = createQueryClient();
  const read = jest
    .fn()
    .mockRejectedValueOnce(new ApiError("network"))
    .mockResolvedValue({ count: 4 });
  const observer = new QueryObserver(client, {
    queryKey: ["count"],
    queryFn: read,
    retryDelay: 0,
  });

  // When
  const unsubscribe = observer.subscribe(() => {});
  try {
    // Then
    await waitFor(() =>
      expect(observer.getCurrentResult()).toMatchObject({
        status: "success",
        data: { count: 4 },
      }),
    );
    expect(read).toHaveBeenCalledTimes(2);
  } finally {
    unsubscribe();
    observer.destroy();
    client.clear();
  }
});

it("reports an offline write once without pausing or replaying it", async () => {
  // Given
  const client = createQueryClient();
  onlineManager.setOnline(false);
  const failure = new Error("Response lost");
  const write = jest.fn().mockRejectedValue(failure);
  const mutation = new MutationObserver(client, { mutationFn: write });
  try {
    // When
    const completion = mutation.mutate(undefined);

    // Then
    await expect(completion).rejects.toBe(failure);

    // When
    onlineManager.setOnline(true);

    // Then
    expect(write).toHaveBeenCalledTimes(1);
    expect(mutation.getCurrentResult()).toMatchObject({
      status: "error",
      isPaused: false,
    });
  } finally {
    client.clear();
  }
});

it("bounds temporary reads to attempts at 0, 1, 3 and 7 seconds", async () => {
  // Given: real Query retries and its native delay, with only request I/O controlled.
  jest.useFakeTimers();
  const client = createQueryClient();
  const failure = new ApiError("network");
  const read = jest.fn().mockRejectedValue(failure);

  // When
  const completion = client.fetchQuery({ queryKey: ["count"], queryFn: read });
  const rejected = expect(completion).rejects.toBe(failure);
  try {
    await jest.advanceTimersByTimeAsync(0);

    // Then
    expect(read).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(999);
    expect(read).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(read).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1999);
    expect(read).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(read).toHaveBeenCalledTimes(3);
    await jest.advanceTimersByTimeAsync(3999);
    expect(read).toHaveBeenCalledTimes(3);
    await jest.advanceTimersByTimeAsync(1);
    await rejected;
    expect(read).toHaveBeenCalledTimes(4);
  } finally {
    client.clear();
  }
});

it.each([408, 429, 500, 502, 503, 504])(
  "retries temporary HTTP %s using the common policy",
  async (status) => {
    // Given
    const client = createQueryClient();
    const read = jest
      .fn()
      .mockRejectedValueOnce(new ApiError("http", status))
      .mockResolvedValue({ count: 4 });
    try {
      // When
      const result = await client.fetchQuery({
        queryKey: ["count"],
        queryFn: read,
        retryDelay: 0,
      });

      // Then
      expect(result).toEqual({ count: 4 });
      expect(read).toHaveBeenCalledTimes(2);
    } finally {
      client.clear();
    }
  },
);

it.each([
  ["configuration", new ApiError("configuration")],
  ["invalid response", new ApiError("schema")],
  ["cancelled transport", new ApiError("cancelled")],
  ["unknown failure", new Error("Unknown")],
  ["unauthenticated", new ApiError("http", 401)],
  ["forbidden", new ApiError("http", 403)],
  ["not found", new ApiError("http", 404)],
  ["business validation", new ApiError("http", 422)],
  ["conflict", new ApiError("http", 409)],
  [
    "maintenance",
    new ApiError("http", 503, {
      type: "urn:blockout:problem:maintenance",
      title: "Maintenance",
      status: 503,
    }),
  ],
  [
    "typed refusal",
    new ApiError("http", 503, {
      type: "urn:blockout:problem:forbidden",
      title: "Forbidden",
      status: 503,
    }),
  ],
])("does not retry %s as a temporary read", async (_name, failure) => {
  // Given
  const client = createQueryClient();
  const read = jest.fn().mockRejectedValue(failure);
  try {
    // When
    const completion = client.fetchQuery({
      queryKey: ["count"],
      queryFn: read,
      retryDelay: 0,
    });

    // Then
    await expect(completion).rejects.toBe(failure);
    expect(read).toHaveBeenCalledTimes(1);
  } finally {
    client.clear();
  }
});

it("does not retry a successful unavailable representation", async () => {
  // Given: HTTP business availability is a successful read, not a Query rejection.
  const client = createQueryClient();
  const read = jest.fn().mockResolvedValue({ availability: "unavailable" });
  try {
    // When
    const result = await client.fetchQuery({
      queryKey: ["standings"],
      queryFn: read,
    });

    // Then
    expect(result).toEqual({ availability: "unavailable" });
    expect(read).toHaveBeenCalledTimes(1);
  } finally {
    client.clear();
  }
});

it("keeps public and private data in separate caches", async () => {
  // Given
  const publicClient = createQueryClient();
  const privateClient = createQueryClient();
  const key = ["shared-key"];
  try {
    // When
    await publicClient.fetchQuery({
      queryKey: key,
      queryFn: async () => "public",
    });
    await privateClient.fetchQuery({
      queryKey: key,
      queryFn: async () => "private",
    });

    // Then
    expect(publicClient.getQueryData(key)).toBe("public");
    expect(privateClient.getQueryData(key)).toBe("private");
    privateClient.clear();
    expect(publicClient.getQueryData(key)).toBe("public");
  } finally {
    publicClient.clear();
    privateClient.clear();
  }
});

it.each(["about:blank", "urn:blockout:problem:unavailable"])(
  "retries the technical problem %s without changing its classification",
  async (type) => {
    // Given
    const client = createQueryClient();
    const read = jest
      .fn()
      .mockRejectedValueOnce(
        new ApiError("http", 503, {
          type,
          title: "Unavailable",
          status: 503,
        }),
      )
      .mockResolvedValue({ count: 4 });
    try {
      // When
      const result = await client.fetchQuery({
        queryKey: ["count"],
        queryFn: read,
        retryDelay: 0,
      });

      // Then
      expect(result).toEqual({ count: 4 });
      expect(read).toHaveBeenCalledTimes(2);
    } finally {
      client.clear();
    }
  },
);

it("preserves an explicit resource-owned no-retry policy", async () => {
  // Given
  const client = createQueryClient();
  const failure = new ApiError("network");
  const read = jest.fn().mockRejectedValue(failure);
  try {
    // When
    const completion = client.fetchQuery({
      queryKey: ["count"],
      queryFn: read,
      retry: false,
    });

    // Then
    await expect(completion).rejects.toBe(failure);
    expect(read).toHaveBeenCalledTimes(1);
  } finally {
    client.clear();
  }
});

it("waits for Query's online resumption without attempting a paused read", async () => {
  // Given: this test supplies connectivity; no new application connectivity subscription is implied.
  const client = createQueryClient();
  client.mount();
  onlineManager.setOnline(false);
  const read = jest.fn().mockResolvedValue({ count: 4 });
  try {
    // When
    const completion = client.fetchQuery({
      queryKey: ["count"],
      queryFn: read,
    });

    // Then
    expect(read).not.toHaveBeenCalled();
    expect(client.getQueryState(["count"])?.fetchStatus).toBe("paused");

    // When
    onlineManager.setOnline(true);

    // Then
    await expect(completion).resolves.toEqual({ count: 4 });
    expect(read).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(["count"])?.fetchStatus).toBe("idle");
  } finally {
    client.unmount();
    client.clear();
  }
});
