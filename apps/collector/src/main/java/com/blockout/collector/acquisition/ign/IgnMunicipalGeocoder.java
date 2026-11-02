package com.blockout.collector.acquisition.ign;

import com.blockout.collector.acquisition.application.MunicipalGeocoder;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.generated.ingestion.model.GeocodingOutcomeEnum;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hc.core5.net.URIBuilder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * IGN Géoplateforme municipal points, using its native city/postcode filters without score rules.
 */
@Component
public class IgnMunicipalGeocoder implements MunicipalGeocoder {
  private static final URI SEARCH = URI.create("https://data.geopf.fr/geocodage/search");
  private static final JsonMapper JSON = JsonMapper.builder().build();
  private final ProviderHttpClient http;

  /**
   * Uses the existing IGN-only bounded budget; public search needs no credential.
   *
   * @param http shared IGN native HTTP client
   */
  public IgnMunicipalGeocoder(@Qualifier("ignProviderClient") ProviderHttpClient http) {
    this.http = http;
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.Locality read(
      String municipality, String postalCode, String revision) {
    if (municipality == null || municipality.isBlank()) throw invalid();
    try {
      URIBuilder query =
          new URIBuilder(SEARCH)
              .setParameter("q", municipality)
              .setParameter("city", municipality)
              .setParameter("index", "address")
              .setParameter("type", "municipality")
              .setParameter("autocomplete", "0")
              .setParameter("limit", "50");
      if (postalCode != null) query.setParameter("postcode", postalCode);
      ProviderHttpClient.StatusResponse response = http.getWithBadRequest(query.build());
      return parse(response.status(), response.body(), revision);
    } catch (URISyntaxException invalid) {
      throw invalid();
    }
  }

  /**
   * Qualifies only native municipality features; malformed/unqualified content stays technical.
   * Neither postcode equality nor a provider score establishes municipal identity. Distinct native
   * city codes remain ambiguous, including a bounded response at its result limit.
   *
   * @param status actual HTTP status
   * @param body complete bounded JSON bytes
   * @param revision original F02 locality revision, never recomputed from provider content
   * @return unique point, ordinary empty or ambiguity; no technical-failure observation is produced
   */
  static SportingObservation.Locality parse(int status, byte[] body, String revision) {
    JsonNode response;
    try {
      response = JSON.readTree(body);
    } catch (RuntimeException malformed) {
      throw invalid();
    }
    if (response == null || !response.isObject()) throw invalid();
    if (status == 400
        && response.path("code").asInt() == 400
        && response.path("details").isArray()
        && response.path("details").size() == 1
        && response.path("details").get(0).asString().equals("city: No matching cities found"))
      return new SportingObservation.Locality(revision, GeocodingOutcomeEnum.EMPTY, null, null);
    if (status != 200
        || !response.path("type").asString().equals("FeatureCollection")
        || !response.path("features").isArray()) throw invalid();
    Map<String, SportingObservation.Locality> cities = new LinkedHashMap<>();
    for (JsonNode feature : response.path("features")) {
      JsonNode properties = feature.path("properties");
      JsonNode coordinates = feature.path("geometry").path("coordinates");
      String code = properties.path("citycode").asString();
      if (!feature.path("type").asString().equals("Feature")
          || !properties.path("type").asString().equals("municipality")
          || code.isBlank()
          || !feature.path("geometry").path("type").asString().equals("Point")
          || !coordinates.isArray()
          || coordinates.size() != 2
          || !coordinates.get(0).isNumber()
          || !coordinates.get(1).isNumber()) throw invalid();
      double longitude = coordinates.get(0).asDouble();
      double latitude = coordinates.get(1).asDouble();
      if (!Double.isFinite(latitude)
          || !Double.isFinite(longitude)
          || Math.abs(latitude) > 90
          || Math.abs(longitude) > 180) throw invalid();
      SportingObservation.Locality point =
          new SportingObservation.Locality(
              revision, GeocodingOutcomeEnum.LOCATED, latitude, longitude);
      SportingObservation.Locality previous = cities.putIfAbsent(code, point);
      if (previous != null && !previous.equals(point)) throw invalid();
    }
    if (cities.isEmpty())
      return new SportingObservation.Locality(revision, GeocodingOutcomeEnum.EMPTY, null, null);
    if (cities.size() == 1 && response.path("features").size() < 50)
      return cities.values().iterator().next();
    return new SportingObservation.Locality(revision, GeocodingOutcomeEnum.AMBIGUOUS, null, null);
  }

  /** Returns a fixed safe category rather than the provider body, municipality or request URL. */
  private static IllegalArgumentException invalid() {
    return new IllegalArgumentException("Unqualified IGN municipal response");
  }
}
