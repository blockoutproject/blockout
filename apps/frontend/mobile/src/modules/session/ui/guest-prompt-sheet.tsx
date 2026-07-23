import React, { useImperativeHandle, useRef } from "react";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import GuestUpsellCard from "./guest-upsell-card";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@/src/shared/theme";

export type GuestPromptSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type GuestPromptSheetProps = {
  ref?: React.Ref<GuestPromptSheetRef>;
};

/** Exposes the native guest prompt sheet to feature-owned interaction points. */
const GuestPromptSheet: React.FC<GuestPromptSheetProps> = ({ ref }) => {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  return (
    <BottomSheetCustomModal ref={sheetRef}>
      <BottomSheetView
        style={{
          paddingHorizontal: spacing[3],
          paddingBottom: insets.bottom,
        }}
        testID="guest-prompt-modal"
      >
        <GuestUpsellCard />
      </BottomSheetView>
    </BottomSheetCustomModal>
  );
};

export default GuestPromptSheet;
