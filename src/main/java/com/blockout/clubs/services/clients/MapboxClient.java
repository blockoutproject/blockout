package com.blockout.clubs.services.clients;

import com.blockout.clubs.config.MapboxProperties;
import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MapboxClient {

    private static final Logger logger = LoggerFactory.getLogger(MapboxClient.class);

    private final RestTemplate restTemplate;
    private final MapboxProperties mapboxProperties;

    private static final String BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

    private static final int LIMIT = 5;
    private static final int MAX_CANDIDATES = 3;

    private static final double MIN_SCORE = 85.0;
    private static final double MIN_MARGIN = 10.0;

    public GeocodingResult geocode(String city, String postalCode) {
        return geocode(city, postalCode, null);
    }

    public GeocodingResult geocode(String city, String postalCode, String address) {
        String q;
        if (address != null && !address.trim().isEmpty()) {
            q = (address.trim() + ", " + postalCode + " " + city).trim();
        } else {
            q = (postalCode + " " + city).trim();
        }

        String encodedQ = UriUtils.encodePathSegment(q, StandardCharsets.UTF_8);

        String url = UriComponentsBuilder
                .fromUriString(BASE_URL)
                .path("/" + encodedQ + ".json")
                .queryParam("access_token", mapboxProperties.getAccessToken())
                .queryParam("limit", LIMIT)
                .queryParam("country", "fr")
                .queryParam("language", "fr")
                .queryParam("types", "address,postcode,place")
                .toUriString();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
            headers.set(HttpHeaders.USER_AGENT, "blockout-clubs/1.0");
            HttpEntity<Void> request = new HttpEntity<>(headers);

            logger.debug("Calling mapbox geocoding",
                    keyValue("action", "mapbox_geocode_call"),
                    keyValue("q", q),
                    keyValue("url", url));

            ResponseEntity<MapboxResponse> response =
                    restTemplate.exchange(url, HttpMethod.GET, request, MapboxResponse.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.warn("Mapbox non-2xx response",
                        keyValue("action", "mapbox_geocode_call"),
                        keyValue("status", response.getStatusCode().value()),
                        keyValue("q", q));
                return null;
            }

            MapboxResponse body = response.getBody();
            if (body == null || body.features == null || body.features.length == 0) {
                logger.warn("No geocoding result",
                        keyValue("action", "mapbox_geocode_no_result"),
                        keyValue("q", q));
                return null;
            }

            int n = Math.min(MAX_CANDIDATES, body.features.length);

            Candidate best = null;
            Candidate second = null;

            for (int i = 0; i < n; i++) {
                MapboxFeature f = body.features[i];
                double score = scoreFeature(f, city, postalCode);

                Candidate c = new Candidate(f, score);

                if (best == null || c.score > best.score) {
                    second = best;
                    best = c;
                } else if (second == null || c.score > second.score) {
                    second = c;
                }
            }

            if (best == null) {
                logger.warn("Geocoding ambiguous (no usable candidate)",
                        keyValue("action", "mapbox_geocode_ambiguous"),
                        keyValue("q", q),
                        keyValue("city", city),
                        keyValue("postalCode", postalCode),
                        keyValue("results", body.features.length));
                return null;
            }

            double margin = (second == null) ? best.score : (best.score - second.score);

            if (best.score < MIN_SCORE || margin < MIN_MARGIN) {
                logger.warn("Geocoding ambiguous — refusing to pick one",
                        keyValue("action", "mapbox_geocode_ambiguous"),
                        keyValue("q", q),
                        keyValue("city", city),
                        keyValue("postalCode", postalCode),
                        keyValue("results", body.features.length),
                        keyValue("bestScore", round1(best.score)),
                        keyValue("secondScore", second == null ? null : round1(second.score)),
                        keyValue("margin", round1(margin)),
                        keyValue("bestPlace", best.feature.place_name));
                return null;
            }

            if (best.feature.center == null || best.feature.center.length < 2) {
                logger.warn("Invalid geocoding result",
                        keyValue("action", "mapbox_geocode_invalid"),
                        keyValue("q", q));
                return null;
            }

            double lon = best.feature.center[0];
            double lat = best.feature.center[1];

            logger.info("Geocoding selected by score",
                    keyValue("action", "mapbox_geocode_selected"),
                    keyValue("q", q),
                    keyValue("city", city),
                    keyValue("postalCode", postalCode),
                    keyValue("place", best.feature.place_name),
                    keyValue("score", round1(best.score)));

            return new GeocodingResult(lat, lon);

        } catch (RestClientResponseException e) {
            logger.warn("Mapbox HTTP error",
                    keyValue("action", "mapbox_geocode_call"),
                    keyValue("status", e.getStatusCode().value()),
                    keyValue("q", q),
                    keyValue("body", e.getResponseBodyAsString()));
            return null;

        } catch (Exception e) {
            logger.error("Mapbox request failed",
                    keyValue("action", "mapbox_geocode_call"),
                    keyValue("q", q),
                    keyValue("error", e.getMessage()), e);
            return null;
        }
    }

    private static double scoreFeature(MapboxFeature f, String city, String postalCode) {
        double score = 0.0;

        double rel = f.relevance != null ? f.relevance : 0.0;
        score += rel * 100.0;

        if (containsType(f, "address")) score += 25.0;
        if (containsType(f, "postcode")) score += 10.0;

        String placeName = safeLower(f.place_name);
        String targetCity = normalizeCity(city);
        String targetPostal = postalCode == null ? "" : postalCode.trim();

        if (!targetPostal.isEmpty() && (placeName.contains(targetPostal) || contextHasPostcode(f, targetPostal))) {
            score += 25.0;
        }

        if (!targetCity.isEmpty() && (placeName.contains(targetCity) || contextHasPlace(f, targetCity))) {
            score += 20.0;
        }

        if (!targetPostal.isEmpty() && !placeName.contains(targetPostal) && !contextHasPostcode(f, targetPostal)) {
            score -= 20.0;
        }

        if (!targetCity.isEmpty() && !placeName.contains(targetCity) && !contextHasPlace(f, targetCity)) {
            score -= 15.0;
        }

        return score;
    }

    private static boolean containsType(MapboxFeature f, String type) {
        if (f.place_type == null) return false;
        for (String t : f.place_type) {
            if (t != null && t.equalsIgnoreCase(type)) return true;
        }
        return false;
    }

    private static boolean contextHasPostcode(MapboxFeature f, String postalCode) {
        if (f.context == null || postalCode == null || postalCode.isEmpty()) return false;
        for (MapboxContext c : f.context) {
            if (c == null) continue;
            if (c.id != null && c.id.startsWith("postcode")) {
                if (c.text != null && c.text.trim().equals(postalCode)) return true;
            }
        }
        return false;
    }

    private static boolean contextHasPlace(MapboxFeature f, String normalizedCityLower) {
        if (f.context == null || normalizedCityLower == null || normalizedCityLower.isEmpty()) return false;
        for (MapboxContext c : f.context) {
            if (c == null) continue;
            if (c.id != null && c.id.startsWith("place")) {
                String ct = normalizeCity(c.text);
                if (!ct.isEmpty() && ct.equals(normalizedCityLower)) return true;
            }
        }
        return false;
    }

    private static String safeLower(String s) {
        if (s == null) return "";
        return s.toLowerCase(Locale.ROOT);
    }

    private static String normalizeCity(String s) {
        if (s == null) return "";
        return s.trim().toLowerCase(Locale.ROOT);
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private record Candidate(MapboxFeature feature, double score) {}

    public record GeocodingResult(double latitude, double longitude) {}

    public static class MapboxResponse {
        public MapboxFeature[] features;
    }

    public static class MapboxFeature {
        public double[] center;
        public String place_name;
        public Double relevance;
        public String[] place_type;
        public MapboxContext[] context;
    }

    public static class MapboxContext {
        public String id;
        public String text;
    }
}