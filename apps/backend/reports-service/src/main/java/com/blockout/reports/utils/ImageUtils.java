package com.blockout.reports.utils;

import lombok.experimental.UtilityClass;
import org.springframework.web.multipart.MultipartFile;

@UtilityClass
public class ImageUtils {

    private static final long MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

    public static void validateImage(MultipartFile image) {
        String contentType = image.getContentType();
        long sizeInBytes = image.getSize();

        if (!"image/png".equals(contentType) && !"image/jpeg".equals(contentType)) {
            throw new IllegalArgumentException("Seuls les formats PNG et JPEG sont autorisés.");
        }

        if (sizeInBytes > MAX_SIZE) {
            throw new IllegalArgumentException("La taille maximale de l’image est de 5 Mo.");
        }
    }
}