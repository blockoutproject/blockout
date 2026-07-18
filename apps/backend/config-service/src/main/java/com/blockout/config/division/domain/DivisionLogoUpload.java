package com.blockout.config.division.domain;

import java.util.Arrays;

public record DivisionLogoUpload(String fileName, String contentType, byte[] content) {

    private static final long MAX_SIZE = 5L * 1024L * 1024L;

    public DivisionLogoUpload {
        content = Arrays.copyOf(content, content.length);
        if (!"image/png".equals(contentType) && !"image/jpeg".equals(contentType)) {
            throw new IllegalArgumentException("Seuls les formats PNG et JPEG sont autorisés.");
        }
        if (content.length > MAX_SIZE) {
            throw new IllegalArgumentException("La taille maximale de l’image est de 5 Mo.");
        }
    }

    @Override
    public byte[] content() {
        return Arrays.copyOf(content, content.length);
    }
}
