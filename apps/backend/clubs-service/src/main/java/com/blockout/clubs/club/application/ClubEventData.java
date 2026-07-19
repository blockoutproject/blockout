package com.blockout.clubs.club.application;

public record ClubEventData(
        String id,
        String name,
        String logoUrl,
        String city,
        boolean active,
        long revision) {

    public static ClubEventData from(ClubView club) {
        return new ClubEventData(
                club.id(),
                club.name(),
                club.logoUrl(),
                club.city(),
                Boolean.TRUE.equals(club.active()),
                club.revision());
    }
}
