package com.blockout.backend.sporting.application.model;

/**
 * Current permitted geocoding context; a null municipality forbids a provider request.
 *
 * @param localityRevision current effective municipal/postal context revision
 * @param municipality permitted effective city, null when unavailable or restricted
 * @param postalCode permitted effective postal code, absent when the municipality is absent
 */
public record ClubLocalityView(String localityRevision, String municipality, String postalCode) {}
