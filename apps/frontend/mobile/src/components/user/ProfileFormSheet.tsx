import React, {forwardRef, useCallback, useRef, useState} from "react";
import {BottomSheetFooterProps, BottomSheetModal} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import ProfileForm, {ProfileFormExternalState} from "@/src/components/user/ProfileForm";
import BottomSheetFormFooter from "@/src/shared/ui/form/BottomSheetFormFooter";
import {CustomUser} from "@/src/types/User";

export type ProfileFormSheetProps = {
  user: CustomUser
  onSuccess: () => void;
  snapPoint?: string | number;
  footerLabel?: string;
};

const ProfileFormSheet = forwardRef<BottomSheetModal, ProfileFormSheetProps>(
  ({user, onSuccess, snapPoint = "90%", footerLabel = "Enregistrer"}, ref) => {
    const submitRef = useRef<() => void>(() => {
    });
    const [footerState, setFooterState] = useState<ProfileFormExternalState>({loading: false, canSubmit: false});

    const handleRegisterSubmit = useCallback((submit: () => void) => {
      submitRef.current = submit;
    }, []);

    const handleStateChange = useCallback((s: ProfileFormExternalState) => {
      setFooterState(s);
    }, []);

    const renderFooter = useCallback(
      (p: BottomSheetFooterProps) => (
        <BottomSheetFormFooter
          {...p}
          label={footerLabel}
          loading={footerState.loading}
          disabled={!footerState.canSubmit}
          onPress={() => submitRef.current()}
        />
      ),
      [footerLabel, footerState.loading, footerState.canSubmit]
    );

    return (
      <BottomSheetCustomModal ref={ref} snapPoint={snapPoint} footerComponent={renderFooter}>
        <ProfileForm
          user={user}
          onSuccess={async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess();
          }}
          onRegisterSubmit={handleRegisterSubmit}
          onStateChange={handleStateChange}
        />
      </BottomSheetCustomModal>
    );
  }
);

export default ProfileFormSheet;
