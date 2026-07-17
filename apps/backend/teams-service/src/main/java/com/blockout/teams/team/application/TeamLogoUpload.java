package com.blockout.teams.team.application;

import java.util.Arrays;

public record TeamLogoUpload(String filename, String contentType, byte[] content) {

    public TeamLogoUpload {
        content = Arrays.copyOf(content, content.length);
    }

    @Override
    public byte[] content() {
        return Arrays.copyOf(content, content.length);
    }
}
