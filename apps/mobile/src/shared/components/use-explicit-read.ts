import { useState } from "react";

/** Tracks the initiating gesture without taking ownership of its read or showing automatic or paused fetches as busy. */
export function useExplicitRead(
  onRead: () => Promise<unknown>,
  fetching: boolean,
) {
  const [requested, setRequested] = useState(false);

  async function read() {
    if (requested) {
      return;
    }
    setRequested(true);
    try {
      await onRead();
    } finally {
      setRequested(false);
    }
  }

  return { requested, progressing: requested && fetching, read };
}
