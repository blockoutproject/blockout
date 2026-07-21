import React, {forwardRef, useImperativeHandle, useRef} from "react";
import {BottomSheetModal, BottomSheetView} from "@gorhom/bottom-sheet";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import GuestUpsellCard from "./GuestUpsellCard";
import {useSafeAreaInsets} from "react-native-safe-area-context";

export type GuestPromptSheetRef = {
  present: () => void;
  dismiss: () => void;
};

const GuestPromptSheet = forwardRef<GuestPromptSheetRef, {}>((_, ref) => {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  return (
    <BottomSheetCustomModal ref={sheetRef}>
      <BottomSheetView style={{paddingHorizontal: 12, paddingBottom: insets.bottom}}>
        <GuestUpsellCard/>
      </BottomSheetView>
    </BottomSheetCustomModal>
  );
});

export default GuestPromptSheet;
