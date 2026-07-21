package com.blockout.clubs.club.api.models;

/**
 * Handwritten internal request used to create a club.
 */
public record CreateClubInternalRequest(
    String id,
    String rawName,
    String name,
    String address,
    String city,
    String postalCode,
    String email,
    String phoneNumber,
    String website,
    String logoUrl) {
}
