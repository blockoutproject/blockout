package com.blockout.clubs.club.application.commands;

/**
 * Application command used to update a club.
 */
public record UpdateClubCommand(
    String rawName,
    String name,
    String address,
    String city,
    String postalCode,
    String email,
    String phoneNumber,
    String website,
    String logoUrl,
    ClubImageCommand image) {
}
