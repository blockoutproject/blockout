import React, { useCallback, useRef, useState } from "react";
import { BottomSheetFooterProps, BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import ProfileForm, {
  ProfileFormState,
} from "@/src/modules/user/ui/ProfileForm";
import BottomSheetFormFooter from "@/src/shared/ui/form/BottomSheetFormFooter";
import { UserResponse } from "@/src/shared/generated/models";

export type ProfileFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  user: UserResponse;
  onSuccess: () => void;
  snapPoint?: string | number;
  footerLabel?: string;
};

const ProfileFormSheet: React.FC<ProfileFormSheetProps> = ({
  ref,
  user,
  onSuccess,
  snapPoint = "90%",
  footerLabel = "Enregistrer",
}) => {
  const submitRef = useRef<() => void>(() => {});
  const [footerState, setFooterState] = useState<ProfileFormState>({
    loading: false,
    canSubmit: false,
  });

  const handleRegisterSubmit = useCallback((submit: () => void) => {
    submitRef.current = submit;
  }, []);

  const handleStateChange = useCallback((s: ProfileFormState) => {
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
    [footerLabel, footerState.loading, footerState.canSubmit],
  );

  return (
    <BottomSheetCustomModal
      ref={ref}
      snapPoint={snapPoint}
      footerComponent={renderFooter}
      title="Modifier le profil"
      message="Personnalise ta photo et ton pseudo."
    >
      <ProfileForm
        user={user}
        onSuccess={async () => {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          onSuccess();
        }}
        onRegisterSubmit={handleRegisterSubmit}
        onStateChange={handleStateChange}
      />
    </BottomSheetCustomModal>
  );
};

export default ProfileFormSheet;
