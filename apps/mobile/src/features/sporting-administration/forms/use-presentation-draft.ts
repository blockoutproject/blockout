import { zodResolver } from "@hookform/resolvers/zod";
import type { File } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { deleteOwnedImage } from "@/shared/images/delete-owned-image";
import type { Presentation } from "../api/presentation";
import {
  presentationSchema,
  type PresentationValues,
} from "../schemas/presentation-schema";
import { presentationValues } from "./presentation-values";

/** The baseline is coherent with the mounted RHF draft; background reads never rebase it. */
interface DraftState {
  baseline?: Presentation;
  feedback?: string;
}

/** Owns a mounted draft and loans a submitted file until the native upload settles. */
export function usePresentationDraft(
  presentation?: Presentation | null,
  defaultValues?: PresentationValues,
) {
  const [state, update] = useState<DraftState>({});
  const form = useForm<PresentationValues>({
    resolver: zodResolver(presentationSchema),
    defaultValues,
  });
  const uploading = useRef<File | undefined>(undefined);
  const released = useRef(false);

  // Publish the first baseline only after RHF has its fields, including the logo draft.
  useEffect(() => {
    if (!state.baseline && presentation) {
      form.reset(presentationValues(presentation));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- RHF must have its fields before the form receives its first baseline.
      update({ baseline: presentation });
    }
  }, [form, presentation, state.baseline]);

  /** Deletes only an app-owned copy no longer used by this draft or its submitted upload. */
  function releaseUnused(file: File | undefined) {
    const logo = form.getValues("logo");
    if (
      file !== uploading.current &&
      (released.current || logo?.action !== "replace" || logo.prepared !== file)
    ) {
      deleteOwnedImage(file);
    }
  }

  useEffect(() => {
    released.current = false;
    return () => {
      released.current = true;
      const logo = form.getValues("logo");
      const file = logo?.action === "replace" ? logo.prepared : undefined;
      if (file !== uploading.current) {
        deleteOwnedImage(file);
      }
    };
  }, [form]);

  /** Transfers the prepared copy to the current form and releases the former copy. */
  function replaceLogo(logo: PresentationValues["logo"]) {
    const previous = form.getValues("logo");
    form.setValue("logo", logo, { shouldDirty: true, shouldValidate: true });
    releaseUnused(
      previous.action === "replace" ? previous.prepared : undefined,
    );
  }

  /** Resets intentionally while preserving the lifetime of any submitted upload. */
  function reset(values?: PresentationValues, keepDirty = false) {
    const previous = form.getValues("logo");
    form.reset(values, { keepDirtyValues: keepDirty, keepDirty });
    releaseUnused(
      previous.action === "replace" ? previous.prepared : undefined,
    );
  }

  return {
    form,
    state,
    update,
    replaceLogo,
    reset,
    /** Keeps the exact submitted copy alive through route removal. */
    beginUpload: (file: File | undefined) => {
      uploading.current = file;
    },
    /** Releases a settled loan if the current form no longer uses it. */
    finishUpload: (file: File | undefined) => {
      if (uploading.current === file) {
        uploading.current = undefined;
      }
      releaseUnused(file);
    },
    /** Explicit abandonment resets the visible draft and releases its unused file. */
    discard: () => reset(),
  };
}
