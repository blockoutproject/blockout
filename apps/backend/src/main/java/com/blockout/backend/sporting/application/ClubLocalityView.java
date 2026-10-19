package com.blockout.backend.sporting.application;

/** Current permitted geocoding context; a null municipality forbids a provider request. */
public record ClubLocalityView(String localityRevision, String municipality, String postalCode) {}
