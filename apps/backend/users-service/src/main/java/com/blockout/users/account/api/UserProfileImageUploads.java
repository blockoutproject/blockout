package com.blockout.users.account.api;

import com.blockout.users.account.application.UserProfileImageUpload;
import java.io.IOException;
import lombok.experimental.UtilityClass;
import org.springframework.web.multipart.MultipartFile;

/** Converts and validates profile images at the multipart boundary. */
@UtilityClass
public class UserProfileImageUploads {

    private static final long MAX_SIZE = 5L * 1024L * 1024L;

    /** Returns validated application-owned image bytes, or null for an absent part. */
    public static UserProfileImageUpload from(MultipartFile image) {
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
            return new UserProfileImageUpload(image.getOriginalFilename(), contentType, image.getBytes());
        } catch (IOException exception) {
            throw new RuntimeException("Échec de la lecture de l’image", exception);
        }
    }
}
