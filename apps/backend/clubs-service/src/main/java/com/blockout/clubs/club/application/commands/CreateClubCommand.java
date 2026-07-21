package com.blockout.clubs.club.application.commands;

/**
 * Application command used to create a club.
 */
public record CreateClubCommand(
    String id,
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
