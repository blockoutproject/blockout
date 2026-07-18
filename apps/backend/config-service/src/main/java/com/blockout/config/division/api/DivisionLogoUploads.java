package com.blockout.config.division.api;

import com.blockout.config.division.domain.DivisionLogoUpload;
import java.io.IOException;
import lombok.experimental.UtilityClass;
import org.springframework.web.multipart.MultipartFile;

@UtilityClass
public class DivisionLogoUploads {

    public static DivisionLogoUpload from(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return null;
        }
        try {
            return new DivisionLogoUpload(image.getOriginalFilename(), image.getContentType(), image.getBytes());
        } catch (IOException exception) {
            throw new IllegalStateException("Échec de la lecture de l’image", exception);
        }
    }
}
