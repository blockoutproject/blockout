package com.blockout.workersearch.projection.infrastructure.http.models;

import java.time.LocalDateTime;

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
