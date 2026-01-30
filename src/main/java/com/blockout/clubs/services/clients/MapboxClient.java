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

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MapboxClient {

    private static final Logger logger = LoggerFactory.getLogger(MapboxClient.class);

    private final RestTemplate restTemplate;
    private final MapboxProperties mapboxProperties;

    private static final String BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

    public GeocodingResult geocode(String city, String postalCode) {
        String q = (postalCode + " " + city).trim();
        String encodedQ = UriUtils.encodePathSegment(q, StandardCharsets.UTF_8);

        String url = UriComponentsBuilder
                .fromUriString(BASE_URL)
                .path("/" + encodedQ + ".json")
                .queryParam("access_token", mapboxProperties.getAccessToken())
                .queryParam("limit", 1)
                .queryParam("country", "fr")
                .queryParam("language", "fr")
                .queryParam("types", "postcode,place,address")
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
                return null;
            }

            MapboxFeature f = body.features[0];
            if (f.center == null || f.center.length < 2) {
                return null;
            }

            double lon = f.center[0];
            double lat = f.center[1];

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

    public record GeocodingResult(double latitude, double longitude) {}

    public static class MapboxResponse {
        public MapboxFeature[] features;
    }

    public static class MapboxFeature {
        public double[] center;
    }
}