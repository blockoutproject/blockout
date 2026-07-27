import React from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { FormSheet } from "@/src/shared/ui/form/form-sheet";
import ProfileForm from "@/src/modules/user/forms/profile-form";
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
  return (
    <FormSheet
      ref={ref}
      snapPoint={snapPoint}
      footerLabel={footerLabel}
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
      />
    </FormSheet>
  );
};

export default ProfileFormSheet;
