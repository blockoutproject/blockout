package com.blockout.collector.acquisition.ign;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.generated.ingestion.model.GeocodingOutcomeEnum;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.apache.hc.core5.net.URIBuilder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;

/** Synthetic IGN responses preserve address and municipality outcomes without contacting IGN. */
@DisplayName("IGN club address and municipality interpretation")
class IgnClubGeocoderTest {
  @Test
  @DisplayName("Uses native municipality/postal filters with the original textual context")
  void sendsMunicipalFilters() {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    doReturn(
            new ProviderHttpClient.StatusResponse(
                200, bytes(collection(feature("75056", "75001", 0.609, 2.34, 48.86)))))
        .when(http)
        .getWithBadRequest(any());

    // When
    SportingObservation.Locality result =
        new IgnClubGeocoder(http).read(null, "ST ETIENNE", "04200", "9");

    // Then
    ArgumentCaptor<URI> request = ArgumentCaptor.forClass(URI.class);
    verify(http).getWithBadRequest(request.capture());
    assertThat(request.getValue().getHost()).isEqualTo("data.geopf.fr");
    assertThat(new URIBuilder(request.getValue()).getQueryParams())
        .extracting(parameter -> parameter.getName() + "=" + parameter.getValue())
        .contains(
            "q=ST ETIENNE",
            "city=ST ETIENNE",
            "postcode=04200",
            "type=municipality",
            "index=address",
            "autocomplete=0",
            "limit=50");
    assertThat(result.localityRevision()).isEqualTo("9");
  }

  @Test
  @DisplayName("A missing permitted municipality cannot contact the provider")
  void refusesMissingMunicipality() {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);

    // When / Then
    assertThatThrownBy(() -> new IgnClubGeocoder(http).read(null, null, "75001", "9"))
        .isInstanceOf(IllegalArgumentException.class);
    verifyNoInteractions(http);
  }

  @Test
  @DisplayName("Accepts a unique municipality despite its representative postcode and low score")
  void acceptsUniqueMunicipality() {
    // Given
    String json = collection(feature("75056", "75001", 0.609, 2.34, 48.86));

    // When
    SportingObservation.Locality result = IgnClubGeocoder.parse(200, bytes(json), "7", true);

    // Then
    assertThat(result.localityRevision()).isEqualTo("7");
    assertThat(result.outcome()).isEqualTo(GeocodingOutcomeEnum.LOCATED);
    assertThat(result.latitude()).isEqualTo(48.86);
    assertThat(result.longitude()).isEqualTo(2.34);
  }

  @Test
  @DisplayName("Keeps distinct municipal candidates ambiguous without score selection")
  void preservesAmbiguity() {
    // Given
    String json =
        collection(
            feature("93066", "93200", 0.99, 2.35, 48.93)
                + ","
                + feature("97411", "97400", 0.1, 55.45, -20.88));

    // When
    SportingObservation.Locality result = IgnClubGeocoder.parse(200, bytes(json), "7", true);

    // Then
    assertThat(result.outcome()).isEqualTo(GeocodingOutcomeEnum.AMBIGUOUS);
    assertThat(result.latitude()).isNull();
    assertThat(result.longitude()).isNull();
  }

  @Test
  @DisplayName("An empty municipal response leaves Monaco or an unmatched context without a point")
  void preservesEmptyResult() {
    // Given
    byte[] response = bytes(collection(""));

    // When
    SportingObservation.Locality result = IgnClubGeocoder.parse(200, response, "7", true);

    // Then
    assertThat(result.outcome()).isEqualTo(GeocodingOutcomeEnum.EMPTY);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"code\":400,\"message\":\"Failed to parse query\",\"detail\":[\"city: No matching cities found\"]}",
        "{\"code\":400,\"message\":\"Failed to parse query\",\"details\":[\"city: No matching cities found\"]}"
      })
  @DisplayName("Qualified singular or plural city-filter errors are ordinary no candidates")
  void qualifiesCityFilterError(String json) {
    // Given
    byte[] response = bytes(json);

    // When
    SportingObservation.Locality result = IgnClubGeocoder.parse(400, response, "7", true);

    // Then
    assertThat(result.localityRevision()).isEqualTo("7");
    assertThat(result.outcome()).isEqualTo(GeocodingOutcomeEnum.EMPTY);
    assertThat(result.latitude()).isNull();
    assertThat(result.longitude()).isNull();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"code\":400,\"detail\":[\"index: Unknown index\"]}",
        "{\"code\":400,\"detail\":[\"city: No matching cities found\",\"index: Unknown index\"]}",
        "{\"code\":400,\"details\":[\"city: No matching cities found\",\"index: Unknown index\"]}",
        "{\"code\":400,\"detail\":[\"city: No matching cities found\"],\"details\":[\"index: Unknown index\"]}",
        "{\"code\":400,\"detail\":[\"index: Unknown index\"],\"details\":[\"city: No matching cities found\"]}",
        "{\"code\":400,\"detail\":\"city: No matching cities found\"}",
        "{\"code\":500,\"detail\":[\"city: No matching cities found\"]}"
      })
  @DisplayName("Additional or unqualified error details remain technical failures")
  void rejectsUnqualifiedCityFilterErrors(String json) {
    // Given
    byte[] response = bytes(json);

    // When / Then
    assertThatThrownBy(() -> IgnClubGeocoder.parse(400, response, "7", true))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "not json",
        "{\"type\":\"FeatureCollection\"}",
        "{\"type\":\"FeatureCollection\",\"features\":[{}]}",
        "{\"type\":\"FeatureCollection\",\"features\":[{\"properties\":{\"type\":\"street\"}}]}"
      })
  @DisplayName("An unqualified successful body remains a technical failure")
  void rejectsMalformedResponse(String json) {
    // Given
    byte[] response = bytes(json);

    // When / Then
    assertThatThrownBy(() -> IgnClubGeocoder.parse(200, response, "7", true))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @ParameterizedTest
  @ValueSource(ints = {400, 404, 429, 500})
  @DisplayName("Unqualified HTTP errors cannot suppress an unresolved locality")
  void rejectsOtherErrors(int status) {
    // Given
    byte[] response = bytes("{\"message\":\"unqualified error\"}");

    // When / Then
    assertThatThrownBy(() -> IgnClubGeocoder.parse(status, response, "7", true))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName("Resolves a unique native address without a municipal fallback or score rule")
  void resolvesAddress() {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    doReturn(
            new ProviderHttpClient.StatusResponse(
                200, bytes(collection(addressFeature("address-1", 2.345, 48.865)))))
        .when(http)
        .getWithBadRequest(any());

    // When
    SportingObservation.Locality result =
        new IgnClubGeocoder(http).read("73 Demonstration road", "Testville", "00123", "9");

    // Then
    assertThat(result.outcome()).isEqualTo(GeocodingOutcomeEnum.LOCATED);
    assertThat(result.latitude()).isEqualTo(48.865);
    assertThat(result.longitude()).isEqualTo(2.345);
    assertThat(result.localityRevision()).isEqualTo("9");
    ArgumentCaptor<URI> request = ArgumentCaptor.forClass(URI.class);
    verify(http).getWithBadRequest(request.capture());
    assertThat(new URIBuilder(request.getValue()).getQueryParams())
        .extracting(parameter -> parameter.getName() + "=" + parameter.getValue())
        .contains("q=73 Demonstration road 00123 Testville", "city=Testville", "postcode=00123")
        .doesNotContain("type=municipality");
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "ambiguous", "municipality"})
  @DisplayName("Normal unusable address results fall back once to the current municipality")
  void fallsBackToMunicipality(String kind) {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    String addressCandidates =
        switch (kind) {
          case "ambiguous" ->
              addressFeature("address-1", 2.3, 48.8) + "," + addressFeature("address-2", 2.4, 48.9);
          case "municipality" -> feature("75056", "75001", 0.609, 2.34, 48.86);
          default -> "";
        };
    doReturn(
            new ProviderHttpClient.StatusResponse(200, bytes(collection(addressCandidates))),
            new ProviderHttpClient.StatusResponse(
                200, bytes(collection(feature("75056", "75001", 0.609, 2.34, 48.86)))))
        .when(http)
        .getWithBadRequest(any());

    // When
    SportingObservation.Locality result =
        new IgnClubGeocoder(http).read("73 Demonstration road", "Paris", "75015", "9");

    // Then
    assertThat(result.outcome()).isEqualTo(GeocodingOutcomeEnum.LOCATED);
    assertThat(result.latitude()).isEqualTo(48.86);
    assertThat(result.localityRevision()).isEqualTo("9");
    ArgumentCaptor<URI> requests = ArgumentCaptor.forClass(URI.class);
    verify(http, org.mockito.Mockito.times(2)).getWithBadRequest(requests.capture());
    assertThat(new URIBuilder(requests.getAllValues().getLast()).getQueryParams())
        .extracting(parameter -> parameter.getName() + "=" + parameter.getValue())
        .contains("q=Paris", "type=municipality", "postcode=75015");
  }

  @Test
  @DisplayName(
      "A malformed address response remains technical and cannot trigger municipal fallback")
  void rejectsMalformedAddressWithoutFallback() {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    doReturn(new ProviderHttpClient.StatusResponse(200, bytes("{}")))
        .when(http)
        .getWithBadRequest(any());

    // When / Then
    assertThatThrownBy(
            () -> new IgnClubGeocoder(http).read("73 Demonstration road", "Paris", "75015", "9"))
        .isInstanceOf(IllegalArgumentException.class);
    verify(http).getWithBadRequest(any());
  }

  /**
   * Creates an attributable invented address; two IDs in one city remain distinct candidates.
   *
   * @param id native address identity
   * @param longitude invented WGS84 longitude
   * @param latitude invented WGS84 latitude
   * @return one synthetic address feature with a low score and representative postcode
   */
  private static String addressFeature(String id, double longitude, double latitude) {
    return feature("75056", "75001", 0.1, longitude, latitude)
        .replace("\"type\":\"municipality\"", "\"type\":\"housenumber\",\"id\":\"" + id + "\"");
  }

  /**
   * Produces native municipal geometry; score and postcode never select between cities.
   *
   * @param code exact native municipality identity
   * @param postcode representative provider postcode
   * @param score provider ranking, irrelevant to acceptance
   * @param longitude municipal WGS84 longitude
   * @param latitude municipal WGS84 latitude
   * @return one synthetic GeoJSON feature
   */
  private static String feature(
      String code, String postcode, double score, double longitude, double latitude) {
    return "{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":["
        + longitude
        + ","
        + latitude
        + "]},\"properties\":{\"type\":\"municipality\",\"citycode\":\""
        + code
        + "\",\"postcode\":\""
        + postcode
        + "\",\"score\":"
        + score
        + "}}";
  }

  /**
   * Creates the provider's GeoJSON envelope with explicit emptiness.
   *
   * @param features comma-delimited synthetic features, empty for no candidates
   * @return GeoJSON collection
   */
  private static String collection(String features) {
    return "{\"type\":\"FeatureCollection\",\"features\":[" + features + "]}";
  }

  /**
   * Encodes provider JSON without retaining source data.
   *
   * @param json synthetic provider document
   * @return UTF-8 bytes
   */
  private static byte[] bytes(String json) {
    return json.getBytes(StandardCharsets.UTF_8);
  }
}
