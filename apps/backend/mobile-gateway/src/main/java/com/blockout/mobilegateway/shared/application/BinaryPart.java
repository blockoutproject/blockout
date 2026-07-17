package com.blockout.mobilegateway.shared.application;

import java.util.Arrays;

/** Application-owned immutable multipart attachment. */
public record BinaryPart(String filename, String contentType, byte[] content) {

    public BinaryPart {
        content = content == null ? new byte[0] : Arrays.copyOf(content, content.length);
    }

    @Override
    public byte[] content() {
        return Arrays.copyOf(content, content.length);
    }
}
