package com.blockout.clubs.club.api;

import com.blockout.clubs.club.domain.ClubLogoUpload;
import java.io.IOException;
import lombok.experimental.UtilityClass;
import org.springframework.web.multipart.MultipartFile;

@UtilityClass
public class ClubLogoUploads {

    public static ClubLogoUpload from(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return null;
        }
        try {
            return new ClubLogoUpload(image.getOriginalFilename(), image.getContentType(), image.getBytes());
        } catch (IOException exception) {
            throw new RuntimeException("Échec de la lecture de l’image", exception);
        }
    }
}
