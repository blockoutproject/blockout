import {
  MutationObserver,
  onlineManager,
  QueryObserver,
} from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import { createQueryClient } from "../query-client";

afterEach(() => onlineManager.setOnline(true));

it("recovers a transient read and publishes the accepted result", async () => {
  // Given: real Query lifecycle, controlled request boundary.
  const client = createQueryClient();
  const read = jest
    .fn()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValue({ count: 4 });
  const observer = new QueryObserver(client, {
    queryKey: ["count"],
    queryFn: read,
    retryDelay: 0,
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    // When / Then
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
    await expect(mutation.mutate(undefined)).rejects.toBe(failure);
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
