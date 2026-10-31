import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  createSupportRequest,
  getCreateSupportRequestMutationKey,
} from "../../../../.generated/mobile";
import {
  createSupportRequestBodyImagesMax,
  SubmitSupportRequest,
  type CreateSupportRequestBody,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { useAccountSession } from "../../accounts/session/account-session-provider";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { supportCredentials } from "./support-credentials";

/**
 * Sends one explicit immutable snapshot through the generated multipart client.
 * The enclosing F05 subject lifetime owns Query and discards this observer on identity change.
 * Unmount attempts cancellation and ignores late completion even when native cancellation fails;
 * neither outcome establishes whether the server accepted the request.
 */
export function useSupportSubmission() {
  const session = useAccountSession();
  const ordinary = useOrdinaryRequest();
  const active = useRef(false);
  const pending = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      pending.current?.abort();
    };
  }, []);
  const mutation = useMutation({
    mutationKey: getCreateSupportRequestMutationKey(),
    gcTime: 0,
    retry: false,
    networkMode: "always",
    mutationFn: async (body: CreateSupportRequestBody) => {
      const controller = new AbortController();
      pending.current = controller;
      try {
        const headers = await supportCredentials(
          ordinary.bypass !== undefined,
          session.getCredentials,
        );
        if (!active.current) throw new ApiError("cancelled");
        const options = ordinary.request({
          headers,
          signal: controller.signal,
        });
        const result = await createSupportRequest(body, {
          ...options,
          onHttpError(error) {
            if (active.current) options.onHttpError?.(error);
          },
        });
        if (!active.current) throw new ApiError("cancelled");
        return result;
      } finally {
        pending.current = undefined;
      }
    },
  });

  /**
   * Captures metadata and the complete selection before credentials or network I/O.
   * A missing prepared file rejects the whole selection; Blob/Expo File contents are immutable.
   * RHF's caller serializes taps and retains its editable values on rejection.
   */
  async function send(
    metadata: SubmitSupportRequest,
    images: readonly (Blob | null | undefined)[] = [],
  ): Promise<void> {
    if (images.length > createSupportRequestBodyImagesMax)
      throw new ApiError("http", 422);
    const files: Blob[] = [];
    for (const image of images) {
      if (!image) throw new ApiError("http", 422);
      files.push(image);
    }
    // Expo File implements Blob without inheriting from it; the native transport owns those file references.
    const body = {
      metadata: SubmitSupportRequest.parse(metadata),
      images: files,
    };
    await mutation.mutateAsync(body);
  }
  return { mutation, send };
}
