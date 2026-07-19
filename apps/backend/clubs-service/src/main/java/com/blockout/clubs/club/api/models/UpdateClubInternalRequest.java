package com.blockout.clubs.club.api.models;

/**
 * Handwritten internal request used to update a club.
 */
public record UpdateClubInternalRequest(
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
