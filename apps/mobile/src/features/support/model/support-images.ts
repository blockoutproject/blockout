import { useEffect, useRef, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { File } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import type { ImagePickerAsset } from "expo-image-picker";
import {
  ImageManipulator,
  SaveFormat,
  type ImageRef,
} from "expo-image-manipulator";
import { useImageSelection } from "../../../shared/images/use-image-selection";
import { deleteOwnedImage } from "../../../shared/images/delete-owned-image";
import type { SupportValues } from "../schemas/support-schema";

/** A selected item stays in RHF until explicitly corrected/removed, including failed preparation. */
export interface SupportImage {
  id: string;
  label: string;
  uri: string;
  file?: File;
  status: "preparing" | "ready" | "error";
}

/**
 * Prepares one native PNG/JPEG, with bounded aspect-preserving decoding and no cropping or retry loop.
 * Native decoding applies orientation. PNG retains screenshot detail; other sources use high-quality JPEG.
 * Actual prepared bytes, never picker metadata, decide admission. The caller owns the returned cache file.
 */
export async function prepareSupportImage(
  asset: ImagePickerAsset,
): Promise<File> {
  const context = ImageManipulator.manipulate(asset.uri, {
    maxWidth: 2560,
    maxHeight: 2560,
  });
  let rendered: ImageRef | undefined;
  let file: File | undefined;
  try {
    rendered = await context.renderAsync();
    const output = await rendered.saveAsync({
      format: asset.mimeType === "image/png" ? SaveFormat.PNG : SaveFormat.JPEG,
      compress: 0.9,
    });
    file = new File(output.uri);
    if (file.size < 1 || file.size > 5 * 1024 * 1024)
      throw new Error("Prepared image exceeds support limit");
    return file;
  } catch (error) {
    deleteOwnedImage(file);
    throw error;
  } finally {
    rendered?.release();
    context.release();
  }
}

/** Owns only native loans/cache files; RHF remains the selected-image and editable-draft owner. */
export function useSupportImages(
  form: UseFormReturn<SupportValues>,
  canSelect: () => boolean,
) {
  const images = useWatch({ control: form.control, name: "images" });
  const active = useRef(false);
  const owned = useRef(new Set<File>());
  const upload = useRef<Promise<void> | undefined>(undefined);
  const nextLabel = useRef(1);
  const [limitError, setLimitError] = useState<string>();
  const { getValues, setValue } = form;

  /** An in-flight multipart send retains its original files even when navigation disposes the editor. */
  function release(file: File) {
    owned.current.delete(file);
    if (upload.current)
      void upload.current.then(
        () => deleteOwnedImage(file),
        () => deleteOwnedImage(file),
      );
    else deleteOwnedImage(file);
  }

  useEffect(() => {
    active.current = true;
    const files = owned.current;
    return () => {
      active.current = false;
      files.forEach((file) => {
        if (upload.current)
          void upload.current.then(
            () => deleteOwnedImage(file),
            () => deleteOwnedImage(file),
          );
        else deleteOwnedImage(file);
      });
      files.clear();
    };
  }, []);

  const selection = useImageSelection({
    multiple: true,
    allowsEditing: false,
    selectionLimit: Math.max(1, 5 - images.length),
    canSelect,
    onSelect: async (assets, replaceId) => {
      const current = getValues("images");
      if (
        assets.length + (replaceId ? current.length - 1 : current.length) >
        5
      ) {
        setLimitError("Vous pouvez joindre cinq images maximum.");
        return;
      }
      setLimitError(undefined);
      for (const asset of assets) {
        if (!active.current) break;
        const previous = replaceId
          ? getValues("images").find((image) => image.id === replaceId)
          : undefined;
        const image: SupportImage = {
          id: previous?.id ?? randomUUID(),
          label: previous?.label ?? `Image ${nextLabel.current++}`,
          uri: "",
          status: "preparing",
        };
        if (previous?.file) release(previous.file);
        update(image, replaceId);
        try {
          const file = await prepareSupportImage(asset);
          if (!active.current) {
            deleteOwnedImage(file);
            break;
          }
          owned.current.add(file);
          update({ ...image, status: "ready", uri: file.uri, file }, image.id);
        } catch {
          if (active.current) update({ ...image, status: "error" }, image.id);
        }
      }
    },
  });

  /** Replaces exactly one selected item without discarding other files or text. */
  function update(image: SupportImage, replaceId?: string) {
    const current = getValues("images");
    setValue(
      "images",
      replaceId
        ? current.map((item) => (item.id === replaceId ? image : item))
        : [...current, image],
      { shouldDirty: true },
    );
  }

  /** Removal is explicit, including an error item; borrowed library originals are never deleted. */
  function remove(id: string) {
    if (!canSelect() || selection.isPending()) return;
    const current = getValues("images");
    const file = current.find((image) => image.id === id)?.file;
    if (file) release(file);
    setValue(
      "images",
      current.filter((image) => image.id !== id),
      { shouldDirty: true },
    );
    setLimitError(undefined);
  }

  return {
    images,
    selection: {
      ...selection,
      select(replaceId?: string) {
        if (!replaceId && getValues("images").length >= 5) {
          setLimitError("Vous pouvez joindre cinq images maximum.");
          return;
        }
        selection.select(replaceId);
      },
    },
    remove,
    error: images.some((image) => image.status === "error")
      ? `${images
          .filter((image) => image.status === "error")
          .map((image) => image.label)
          .join(
            ", ",
          )} : remplacez ou supprimez chaque image refusée (PNG/JPEG, 5 Mio maximum).`
      : limitError,
    /** Retains all current native references until this explicit send settles, including after unmount. */
    retainUntil(promise: Promise<void>) {
      upload.current = promise;
      const done = () => {
        if (upload.current === promise) upload.current = undefined;
      };
      void promise.then(done, done);
    },
  };
}
