package com.blockout.teams.team.application.commands;

/** Framework-independent Team logo content. */
public record TeamImageCommand(byte[] content, String filename, String contentType) {

    /** Reports whether this command contains uploadable bytes. */
    public boolean isEmpty() {
        return content == null || content.length == 0;
    }
}
