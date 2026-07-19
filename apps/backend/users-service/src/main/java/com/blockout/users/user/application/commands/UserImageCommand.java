package com.blockout.users.user.application.commands;

public record UserImageCommand(byte[] content, String fileName, String contentType) {

    public boolean isEmpty() {
        return content == null || content.length == 0;
    }
}
