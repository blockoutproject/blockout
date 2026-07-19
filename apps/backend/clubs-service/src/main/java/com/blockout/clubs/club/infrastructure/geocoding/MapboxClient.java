package com.blockout.clubs.club.infrastructure.geocoding;

import com.blockout.clubs.config.MapboxProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class MapboxClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(MapboxClient.class);
    private static final String BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

    private final RestTemplate restTemplate;
    private final MapboxProperties mapboxProperties;

    public GeocodingResult geocode(String city, String postalCode, String address) {
        String query = address != null && !address.isBlank()
                ? address.trim() + ", " + postalCode + " " + city
                : postalCode + " " + city;
        String encodedQuery = UriUtils.encodePathSegment(query.trim(), StandardCharsets.UTF_8);
        String url = UriComponentsBuilder.fromUriString(BASE_URL)
                .path("/" + encodedQuery + ".json")
                .queryParam("access_token", mapboxProperties.getAccessToken())
                .queryParam("limit", 5)
                .queryParam("country", "fr")
                .queryParam("language", "fr")
                .queryParam("types", "postcode,place,address")
                .toUriString();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
            headers.set(HttpHeaders.USER_AGENT, "blockout-clubs/1.0");
            ResponseEntity<MapboxResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<Void>(headers),
                    MapboxResponse.class);
            MapboxResponse body = response.getBody();
            if (!response.getStatusCode().is2xxSuccessful()
                    || body == null
                    || body.features == null
                    || body.features.length != 1
                    || body.features[0].center == null
                    || body.features[0].center.length < 2) {
                LOGGER.warn("Mapbox geocoding did not return one unambiguous result",
                        keyValue("action", "mapbox_geocode"),
                        keyValue("query", query));
                return null;
            }
            return new GeocodingResult(body.features[0].center[1], body.features[0].center[0]);
        } catch (RestClientResponseException exception) {
            LOGGER.warn("Mapbox HTTP error",
                    keyValue("action", "mapbox_geocode"),
                    keyValue("status", exception.getStatusCode().value()),
                    keyValue("query", query));
            return null;
        } catch (Exception exception) {
            LOGGER.error("Mapbox request failed",
                    keyValue("action", "mapbox_geocode"),
                    keyValue("query", query),
                    exception);
            return null;
        }
    }

    public record GeocodingResult(double latitude, double longitude) {
    }

    public static class MapboxResponse {
        public MapboxFeature[] features;
    }

    public static class MapboxFeature {
        public double[] center;
    }
}
