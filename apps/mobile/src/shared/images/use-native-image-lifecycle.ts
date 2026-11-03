import { useState } from "react";

/** Native callbacks for one admitted URI; a different accepted read permits retry only after its native failure. */
export interface NativeImageLifecycle {
  /** Keys only native image hosts and guards their callbacks; successful identical-URI reads retain this attempt. */
  attemptKey: number;
  status: "pending" | "displayed" | "failed";
  onDisplay: () => void;
  onError: () => void;
}

/** The local attempt key identifies one native load independently from the latest accepted read revision. */
interface NativeImageState {
  uri?: string;
  revision?: number;
  attemptKey: number;
  status: NativeImageLifecycle["status"];
}

/** Retains pending/displayed media across identical-byte reads; URI changes or a failed read's new revision start a new attempt. */
export function useNativeImageLifecycle(
  uri?: string,
  revision?: number,
): NativeImageLifecycle {
  const [image, setImage] = useState<NativeImageState>(() => ({
    uri,
    revision,
    attemptKey: 0,
    status: "pending",
  }));
  // Replace only native image state before commit; surrounding cards and business content stay mounted.
  if (image.uri !== uri || image.revision !== revision) {
    const restart = image.uri !== uri || image.status === "failed";
    setImage({
      uri,
      revision,
      attemptKey: image.attemptKey + (restart ? 1 : 0),
      status: restart ? "pending" : image.status,
    });
  }
  const attemptKey = image.attemptKey;

  /** Rejects callbacks queued by a replaced source and prevents a late display from undoing its failure. */
  function settleImage(status: "displayed" | "failed") {
    setImage((current) =>
      current.attemptKey !== attemptKey || current.status === "failed"
        ? current
        : { ...current, status },
    );
  }

  return {
    attemptKey,
    status: image.status,
    onDisplay: () => settleImage("displayed"),
    onError: () => settleImage("failed"),
  };
}
