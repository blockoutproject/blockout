package com.blockout.clubs.club.geocoding.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.clubs.club.geocoding.application.ClubGeocodingQuery;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class MapboxClubGeocoderTest {

    @Test
    void mapsOneProviderFeatureWithoutLeakingProviderFields() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
        server.expect(anything())
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.USER_AGENT, "blockout-clubs/1.0"))
                .andRespond(withSuccess(
                        "{\"features\":[{\"center\":[2.3,48.8],\"place_name\":\"ignored\"}]}",
                        MediaType.APPLICATION_JSON));
        MapboxProperties properties = new MapboxProperties();
        properties.setAccessToken("token");

        var result = new MapboxClubGeocoder(restTemplate, properties)
                .geocode(new ClubGeocodingQuery("Paris", "75001", "1 rue"));

        assertThat(result).hasValueSatisfying(coordinates -> {
            assertThat(coordinates.latitude()).isEqualTo(48.8);
            assertThat(coordinates.longitude()).isEqualTo(2.3);
        });
        server.verify();
    }

    @Test
    void refusesAmbiguousProviderFeatures() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
        server.expect(anything()).andRespond(withSuccess(
                "{\"features\":[{\"center\":[2.3,48.8]},{\"center\":[2.4,48.9]}]}",
                MediaType.APPLICATION_JSON));
        MapboxProperties properties = new MapboxProperties();
        properties.setAccessToken("token");

        assertThat(new MapboxClubGeocoder(restTemplate, properties)
                .geocode(new ClubGeocodingQuery("Paris", "75001", null))).isEmpty();
        server.verify();
    }
}
