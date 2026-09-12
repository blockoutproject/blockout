package com.blockout.backend.identity.user.application;

/** Minimal synchronized attributes; none is an identity or authorization key. */
public record ExternalProfile(
    String email, String firstName, String lastName, String phoneNumber, String pictureUrl) {}
