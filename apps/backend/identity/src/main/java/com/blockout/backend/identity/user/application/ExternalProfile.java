package com.blockout.backend.identity.user.application;

/**
 * Minimal verified provider attributes; every attribute is nullable and none is an identity key.
 *
 * @param email optional contact email used only as an initial pseudonym hint
 * @param firstName optional given name
 * @param lastName optional family name
 * @param phoneNumber optional contact number
 * @param pictureUrl optional provider picture location
 */
public record ExternalProfile(
    String email, String firstName, String lastName, String phoneNumber, String pictureUrl) {}
