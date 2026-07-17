package com.blockout.clubs.club.api;

import com.blockout.clubs.club.application.ClubLogoUpload;
import java.io.IOException;
import lombok.experimental.UtilityClass;
import org.springframework.web.multipart.MultipartFile;

@UtilityClass
public class ClubLogoUploads {

    private static final long MAX_SIZE = 5L * 1024L * 1024L;

    public static ClubLogoUpload from(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return null;
        }
        String contentType = image.getContentType();
        if (!"image/png".equals(contentType) && !"image/jpeg".equals(contentType)) {
            throw new IllegalArgumentException("Seuls les formats PNG et JPEG sont autorisés.");
        }
        if (image.getSize() > MAX_SIZE) {
            throw new IllegalArgumentException("La taille maximale de l’image est de 5 Mo.");
        }
        try {
            return new ClubLogoUpload(image.getOriginalFilename(), contentType, image.getBytes());
        } catch (IOException exception) {
            throw new RuntimeException("Échec de la lecture de l’image", exception);
        }
    }
}
