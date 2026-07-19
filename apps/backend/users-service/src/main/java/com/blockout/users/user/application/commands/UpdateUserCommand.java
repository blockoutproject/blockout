package com.blockout.users.user.application.commands;

public record UpdateUserCommand(String pseudo, String pictureUrl, UserImageCommand image) {
}
