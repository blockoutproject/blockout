package com.blockout.collector.acquisition.ign;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.generated.ingestion.model.GeocodingOutcomeEnum;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import org.apache.hc.core5.net.URIBuilder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;

/** Synthetic IGN responses preserve the documented municipal outcomes without contacting IGN. */
@DisplayName("IGN municipal interpretation")
class IgnMunicipalityTest {
  @Test
  @DisplayName("Uses native municipality/postal filters with the original textual context")
  void sendsMunicipalFilters() {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.getWithBadRequest(any()))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderHttpClient.StatusResponse(
                    200, bytes(collection(feature("75056", "75001", 0.609, 2.34, 48.86))))));

    // When
    SportingObservation.Locality result =
        new IgnMunicipalGeocoder(http).read("ST ETIENNE", "04200", "9");

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
    assertThatThrownBy(() -> new IgnMunicipalGeocoder(http).read(null, "75001", "9"))
        .isInstanceOf(IllegalArgumentException.class);
    verifyNoInteractions(http);
  }

  @Test
  @DisplayName("Accepts a unique municipality despite its representative postcode and low score")
  void acceptsUniqueMunicipality() {
    // Given
    String json = collection(feature("75056", "75001", 0.609, 2.34, 48.86));

    // When
    SportingObservation.Locality result = IgnMunicipalGeocoder.parse(200, bytes(json), "7");

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
    SportingObservation.Locality result = IgnMunicipalGeocoder.parse(200, bytes(json), "7");

    // Then
    assertThat(result.outcome()).isEqualTo(GeocodingOutcomeEnum.AMBIGUOUS);
    assertThat(result.latitude()).isNull();
    assertThat(result.longitude()).isNull();
  }

  @Test
  @DisplayName("An empty municipal response leaves Monaco or an unmatched context without a point")
  void preservesEmptyResult() {
    // Given / When
    SportingObservation.Locality result =
        IgnMunicipalGeocoder.parse(200, bytes(collection("")), "7");

    // Then
    assertThat(result.outcome()).isEqualTo(GeocodingOutcomeEnum.EMPTY);
  }

  @Test
  @DisplayName("Only the qualified city-filter error is an ordinary no candidate")
  void qualifiesCityFilterError() {
    // Given / When
    SportingObservation.Locality result =
        IgnMunicipalGeocoder.parse(
            400,
            bytes(
                "{\"code\":400,\"message\":\"Failed to parse query\",\"details\":[\"city: No matching cities found\"]}"),
            "7");

    // Then
    assertThat(result.outcome()).isEqualTo(GeocodingOutcomeEnum.EMPTY);
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
    // Given / When / Then
    assertThatThrownBy(() -> IgnMunicipalGeocoder.parse(200, bytes(json), "7"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @ParameterizedTest
  @ValueSource(ints = {400, 404, 429, 500})
  @DisplayName("Unqualified HTTP errors cannot suppress an unresolved locality")
  void rejectsOtherErrors(int status) {
    // Given / When / Then
    assertThatThrownBy(
            () ->
                IgnMunicipalGeocoder.parse(
                    status, bytes("{\"message\":\"unqualified error\"}"), "7"))
        .isInstanceOf(IllegalArgumentException.class);
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
