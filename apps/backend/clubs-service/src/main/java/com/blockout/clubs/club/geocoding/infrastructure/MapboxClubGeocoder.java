package com.blockout.clubs.club.geocoding.infrastructure;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.clubs.club.geocoding.application.ClubCoordinates;
import com.blockout.clubs.club.geocoding.application.ClubGeocoder;
import com.blockout.clubs.club.geocoding.application.ClubGeocodingQuery;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
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

@Component
@RequiredArgsConstructor
public class MapboxClubGeocoder implements ClubGeocoder {

    private static final Logger LOGGER = LoggerFactory.getLogger(MapboxClubGeocoder.class);
    private static final String BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

    private final RestTemplate mapboxRestTemplate;
    private final MapboxProperties properties;

    @Override
    public Optional<ClubCoordinates> geocode(ClubGeocodingQuery query) {
        String search = search(query);
        String encodedSearch = UriUtils.encodePathSegment(search, StandardCharsets.UTF_8);
        String url = UriComponentsBuilder.fromUriString(BASE_URL)
                .path("/" + encodedSearch + ".json")
                .queryParam("access_token", properties.getAccessToken())
                .queryParam("limit", 5)
                .queryParam("country", "fr")
                .queryParam("language", "fr")
                .queryParam("types", "postcode,place,address")
                .toUriString();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
            headers.set(HttpHeaders.USER_AGENT, "blockout-clubs/1.0");
            LOGGER.debug("Calling mapbox geocoding", keyValue("action", "mapbox_geocode_call"),
                    keyValue("q", search), keyValue("url", url));

            ResponseEntity<MapboxResponse> response = mapboxRestTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<Void>(headers), MapboxResponse.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                LOGGER.warn("Mapbox non-2xx response", keyValue("action", "mapbox_geocode_call"),
                        keyValue("status", response.getStatusCode().value()), keyValue("q", search));
                return Optional.empty();
            }

            MapboxResponse body = response.getBody();
            if (body == null || body.features == null || body.features.length == 0) {
                LOGGER.warn("No geocoding result", keyValue("action", "mapbox_geocode_no_result"),
                        keyValue("q", search));
                return Optional.empty();
            }
            if (body.features.length > 1) {
                LOGGER.warn("Ambiguous geocoding result — refusing to pick one",
                        keyValue("action", "mapbox_geocode_ambiguous"), keyValue("q", search),
                        keyValue("results", body.features.length));
                return Optional.empty();
            }

            MapboxFeature feature = body.features[0];
            if (feature.center == null || feature.center.length < 2) {
                LOGGER.warn("Invalid geocoding result", keyValue("action", "mapbox_geocode_invalid"),
                        keyValue("q", search));
                return Optional.empty();
            }
            return Optional.of(new ClubCoordinates(feature.center[1], feature.center[0]));
        } catch (RestClientResponseException exception) {
            LOGGER.warn("Mapbox HTTP error", keyValue("action", "mapbox_geocode_call"),
                    keyValue("status", exception.getStatusCode().value()), keyValue("q", search),
                    keyValue("body", exception.getResponseBodyAsString()));
            return Optional.empty();
        } catch (Exception exception) {
            LOGGER.error("Mapbox request failed", keyValue("action", "mapbox_geocode_call"),
                    keyValue("q", search), keyValue("error", exception.getMessage()), exception);
            return Optional.empty();
        }
    }

    private String search(ClubGeocodingQuery query) {
        if (query.address() != null && !query.address().trim().isEmpty()) {
            return (query.address().trim() + ", " + query.postalCode() + " " + query.city()).trim();
        }
        return (query.postalCode() + " " + query.city()).trim();
    }

    static final class MapboxResponse {
        public MapboxFeature[] features;
    }

    static final class MapboxFeature {
        public double[] center;
        public String place_name;
    }
}
