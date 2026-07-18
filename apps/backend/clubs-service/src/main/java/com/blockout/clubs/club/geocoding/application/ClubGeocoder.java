package com.blockout.clubs.club.geocoding.application;

import java.util.Optional;

public interface ClubGeocoder {

    Optional<ClubCoordinates> geocode(ClubGeocodingQuery query);
}
