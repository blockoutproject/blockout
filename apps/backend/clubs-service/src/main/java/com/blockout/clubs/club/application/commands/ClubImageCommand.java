package com.blockout.clubs.club.application.commands;

/**
 * Framework-independent image content passed into the Club application layer.
 */
public record ClubImageCommand(
    byte[] content,
    String filename,
    String contentType) {

    /**
     * Reports whether the command carries image bytes.
     */
    public boolean isEmpty() {
        return content == null || content.length == 0;
    }
}
