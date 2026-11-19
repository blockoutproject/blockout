import NativeMaskedView, {
  type MaskedViewProps,
} from "@react-native-masked-view/masked-view";
import type { ComponentType } from "react";

/** Masked View 0.3.2 still declares a legacy native-method mixin around its React component. */
export const MaskedView =
  NativeMaskedView as unknown as ComponentType<MaskedViewProps>;
