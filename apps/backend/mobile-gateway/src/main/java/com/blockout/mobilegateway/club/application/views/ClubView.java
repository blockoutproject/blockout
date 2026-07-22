package com.blockout.mobilegateway.club.application.views;

import java.time.LocalDateTime;

/** Club projection used by gateway application services. */
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
        Double latitude,
        Double longitude,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate) {

    public ClubView withoutPhoneNumber() {
        return new ClubView(
            id, rawName, name, address, city, postalCode, email, null, website, logoUrl,
            latitude, longitude, active, createdAt, lastUpdate);
    }
}
