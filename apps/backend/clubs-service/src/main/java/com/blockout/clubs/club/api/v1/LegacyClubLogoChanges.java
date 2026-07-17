package com.blockout.clubs.club.api.v1;

import com.blockout.clubs.club.api.ClubLogoUploads;
import com.blockout.clubs.club.application.ClubLogoChange;
import com.blockout.clubs.club.application.ClubLogoUpload;
import lombok.experimental.UtilityClass;
import org.springframework.web.multipart.MultipartFile;

@UtilityClass
class LegacyClubLogoChanges {

    static ClubLogoChange from(String bodyLogoUrl, MultipartFile image) {
        ClubLogoUpload upload = ClubLogoUploads.from(image);
        if (upload != null) {
            return ClubLogoChange.replace(upload);
        }
        return bodyLogoUrl == null ? ClubLogoChange.remove() : ClubLogoChange.keep();
    }
}
