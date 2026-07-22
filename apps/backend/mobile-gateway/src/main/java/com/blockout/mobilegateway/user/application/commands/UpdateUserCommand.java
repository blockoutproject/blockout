package com.blockout.mobilegateway.user.application.commands;

/** Values accepted when updating a user through the gateway. */
public record UpdateUserCommand(String pseudo, String pictureUrl) {
}
