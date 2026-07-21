package com.blockout.clubs.club.application.views;

import java.time.LocalDateTime;

/**
 * Complete application view of a club.
 */
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
    boolean active,
    Double latitude,
    Double longitude,
    LocalDateTime createdAt,
    LocalDateTime lastUpdate) {
}
