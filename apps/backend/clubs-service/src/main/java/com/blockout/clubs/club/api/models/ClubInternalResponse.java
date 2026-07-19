package com.blockout.clubs.club.api.models;

import java.time.LocalDateTime;

/**
 * Complete internal Club representation owned by clubs-service.
 */
public record ClubInternalResponse(
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
        boolean active,
        Double latitude,
        Double longitude,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate) {
}
