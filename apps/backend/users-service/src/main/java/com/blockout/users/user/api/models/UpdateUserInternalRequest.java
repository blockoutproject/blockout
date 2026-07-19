package com.blockout.users.user.api.models;

/** Editable fields accepted by the current profile endpoint. */
public record UpdateUserInternalRequest(String pseudo, String pictureUrl) {
}
