package com.blockout.clubs.club.geocoding.application;

public interface ClubGeocodingTarget {

    String id();

    ClubGeocodingQuery query();

    void save(ClubCoordinates coordinates);
}
