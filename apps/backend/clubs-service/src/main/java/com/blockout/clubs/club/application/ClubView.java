package com.blockout.clubs.club.application;

import java.time.LocalDateTime;

public record ClubView(
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
        Boolean active,
        Double latitude,
        Double longitude,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate) {
}
