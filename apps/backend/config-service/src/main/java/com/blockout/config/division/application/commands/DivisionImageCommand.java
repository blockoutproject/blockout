package com.blockout.config.division.application.commands;

/** Framework-independent division image upload. */
public record DivisionImageCommand(String fileName, String contentType, byte[] content) {

    /** Returns whether the upload has no bytes. */
    public boolean isEmpty() {
        return content == null || content.length == 0;
    }
}
