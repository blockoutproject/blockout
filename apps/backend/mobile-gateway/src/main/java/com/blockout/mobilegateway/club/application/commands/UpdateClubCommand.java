package com.blockout.mobilegateway.club.application.commands;

/** Values accepted when updating a Club through the mobile gateway. */
public record UpdateClubCommand(
        String rawName,
        String name,
        String address,
        String city,
        String postalCode,
        String logoUrl,
        String email,
        String phoneNumber,
        String website) {
}
