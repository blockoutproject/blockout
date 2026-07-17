package com.blockout.clubs.club.application;

import java.util.Arrays;

public record ClubLogoUpload(String filename, String contentType, byte[] content) {

    public ClubLogoUpload {
        content = Arrays.copyOf(content, content.length);
    }

    @Override
    public byte[] content() {
        return Arrays.copyOf(content, content.length);
    }
}
