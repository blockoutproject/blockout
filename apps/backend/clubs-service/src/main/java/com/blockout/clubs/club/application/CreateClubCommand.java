package com.blockout.clubs.club.application;

public record CreateClubCommand(
        String id,
        String rawName,
        String name,
        String city,
        String postalCode,
        String email,
        String phoneNumber,
        String website) {
}
