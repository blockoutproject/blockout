package com.blockout.clubs.club.application;

public record ClubUpsertFact(String id, String name, String logoUrl, String city) {

    public static ClubUpsertFact from(ClubView club) {
        return new ClubUpsertFact(club.id(), club.name(), club.logoUrl(), club.city());
    }
}
