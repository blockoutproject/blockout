package com.blockout.clubs.club.application;

public record UpdateClubCommand(
        String rawName,
        String name,
        String address,
        String city,
        String postalCode,
        String email,
        String phoneNumber,
        String website) {
}
