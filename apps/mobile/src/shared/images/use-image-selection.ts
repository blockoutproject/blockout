import { Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { deleteOwnedImage } from "./delete-owned-image";
import { useActionFeedback } from "../components/action-feedback";

/**
 * Native selection and the caller's preparation share one operation. Delivered app-cache copies
 * are borrowed until `onSelect` settles; prepare, copy or read accepted bytes before resolving.
 * Library/content-provider sources remain borrowed. The Android crop intermediate that Expo does
 * not return remains the documented SDK exception (#523); this owner deletes only returned copies.
 * Key or unmount the owner when its session/resource changes; feature callbacks also guard their identity.
 */
export interface ImageSelectionOptions {
  /** Checks other operation owners synchronously before opening native UI, including commands admitted this turn. */
  canSelect?: () => boolean;
  onSelect: (
    assets: ImagePicker.ImagePickerAsset[],
    replaceId?: string,
  ) => void | Promise<void>;
  multiple?: boolean;
  /** Remaining native capacity for multiple additions; replacements always select one asset. */
  selectionLimit?: number;
  /** Native cropping applies only to single selection; no upload format validation is implied. */
  allowsEditing?: boolean;
  /** Android crop ratio; iOS native editing always crops to a square. */
  aspect?: ImagePicker.ImagePickerOptions["aspect"];
}

/** Observable selection owner shared by the field and the form's write exclusion. */
export interface ImageSelection {
  select: (replaceId?: string) => void;
  /** Reads the operation handle before React renders; paired writes use this to exclude a just-started picker. */
  isPending: () => boolean;
  pending: boolean;
}

/** Owns one native selection/preparation loan, rejecting duplicate events before React rerenders. */
export function useImageSelection({
  canSelect,
  onSelect,
  multiple = false,
  selectionLimit = 1,
  allowsEditing = false,
  aspect,
}: ImageSelectionOptions): ImageSelection {
  const feedback = useActionFeedback();
  const active = useRef(false);
  const operation = useRef<Promise<void> | undefined>(undefined);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  /** Cancellation preserves the draft; all completed loans release delivered cache copies, even after unmount. */
  async function choose(replaceId?: string) {
    let assets: ImagePicker.ImagePickerAsset[] = [];
    try {
      const allowsMultipleSelection = multiple && replaceId === undefined;
      // The image-only system library requires no broad photo permission request.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: allowsEditing && !allowsMultipleSelection,
        aspect,
        allowsMultipleSelection,
        selectionLimit: allowsMultipleSelection ? selectionLimit : 1,
      });
      assets = result.assets ?? [];
      if (active.current && !result.canceled) await onSelect(assets, replaceId);
    } catch {
      feedback.error();
    } finally {
      if (active.current) setPending(false);
      assets.forEach(({ uri }) => {
        if (isPickerCacheCopy(uri)) deleteOwnedImage(uri);
      });
    }
  }

  /** Reserves the native operation synchronously; no selection or preparation is queued or replayed. */
  function select(replaceId?: string) {
    if (!active.current || operation.current || canSelect?.() === false) return;
    feedback.clear();
    setPending(true);
    const selection = choose(replaceId).finally(() => {
      if (operation.current === selection) operation.current = undefined;
    });
    operation.current = selection;
  }

  return {
    select,
    isPending: () => operation.current !== undefined,
    pending,
  };
}

/** Only returned app-cache file copies are owned; native fallback content/library URIs are borrowed. */
function isPickerCacheCopy(uri: string): boolean {
  try {
    const selected = new URL(uri);
    const cache = new URL(Paths.cache.uri);
    if (
      selected.protocol !== "file:" ||
      selected.host !== cache.host ||
      selected.search ||
      selected.hash
    )
      return false;
    const selectedPath = Paths.normalize(decodeURIComponent(selected.pathname));
    const cachePath = Paths.normalize(
      decodeURIComponent(cache.pathname),
    ).replace(/\/$/, "");
    return selectedPath.startsWith(`${cachePath}/`);
  } catch {
    return false;
  }
}
