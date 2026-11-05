package com.blockout.collector.acquisition.ign;

import com.blockout.collector.acquisition.application.ClubGeocoder;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.generated.ingestion.model.GeocodingOutcomeEnum;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.apache.hc.core5.net.URIBuilder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * IGN Géoplateforme club addresses with a municipality fallback, using native filters without score
 * rules.
 */
@Component
public class IgnClubGeocoder implements ClubGeocoder {
  private static final URI SEARCH = URI.create("https://data.geopf.fr/geocodage/search");
  private static final JsonMapper JSON = JsonMapper.builder().build();
  private final ProviderHttpClient http;

  /**
   * Uses the existing IGN-only bounded budget; public search needs no credential.
   *
   * @param http shared IGN native HTTP client
   */
  public IgnClubGeocoder(@Qualifier("ignProviderClient") ProviderHttpClient http) {
    this.http = http;
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.Locality read(
      String address, String municipality, String postalCode, String revision) {
    if (municipality == null || municipality.isBlank()) throw invalid();
    if (address != null && !address.isBlank()) {
      String fullAddress =
          address.strip() + " " + (postalCode == null ? "" : postalCode + " ") + municipality;
      ProviderHttpClient.StatusResponse response =
          search(fullAddress, municipality, postalCode, false);
      SportingObservation.Locality point =
          parse(response.status(), response.body(), revision, false);
      if (point.outcome() == GeocodingOutcomeEnum.LOCATED) return point;
    }
    ProviderHttpClient.StatusResponse response =
        search(municipality, municipality, postalCode, true);
    return parse(response.status(), response.body(), revision, true);
  }

  /**
   * Uses the native address index and filters for one phase, sharing the existing bounded budget.
   *
   * @param query address with current context, or municipality alone for fallback
   * @param municipality permitted current city filter
   * @param postalCode optional current postal filter
   * @param municipal restrict the fallback to native municipality features
   * @return bounded response, retaining only the specifically interpretable HTTP400
   */
  private ProviderHttpClient.StatusResponse search(
      String query, String municipality, String postalCode, boolean municipal) {
    try {
      URIBuilder uri =
          new URIBuilder(SEARCH)
              .setParameter("q", query)
              .setParameter("city", municipality)
              .setParameter("index", "address")
              .setParameter("autocomplete", "0")
              .setParameter("limit", "50");
      if (municipal) uri.setParameter("type", "municipality");
      if (postalCode != null) uri.setParameter("postcode", postalCode);
      return http.getWithBadRequest(uri.build());
    } catch (URISyntaxException invalid) {
      throw invalid();
    }
  }

  /**
   * Qualifies native address features by their ID or municipalities by citycode; malformed content
   * stays technical. Neither postcode equality nor a provider score selects a candidate. Distinct
   * native identities remain ambiguous, including a bounded response at its result limit. A
   * municipal feature in an address response cannot stand in for a resolved street address. A
   * city-filter error may use singular or plural detail, but not both envelopes or additional
   * errors.
   *
   * @param status actual HTTP status
   * @param body complete bounded JSON bytes
   * @param revision original F02 locality revision, never recomputed from provider content
   * @param municipal whether only municipality features are expected
   * @return unique point, ordinary empty or ambiguity; no technical-failure observation is produced
   * @throws IllegalArgumentException when neither municipal data nor the city-filter error
   *     qualifies
   */
  static SportingObservation.Locality parse(
      int status, byte[] body, String revision, boolean municipal) {
    JsonNode response;
    try {
      response = JSON.readTree(body);
    } catch (RuntimeException malformed) {
      throw invalid();
    }
    if (response == null || !response.isObject()) throw invalid();
    if (status == 400 && response.path("code").asInt() == 400) {
      JsonNode details = response.path("detail");
      if (details.isMissingNode()) details = response.path("details");
      else if (response.has("details")) throw invalid();
      if (details.isArray()
          && details.size() == 1
          && details.get(0).asString().equals("city: No matching cities found"))
        return new SportingObservation.Locality(revision, GeocodingOutcomeEnum.EMPTY, null, null);
    }
    if (status != 200
        || !response.path("type").asString().equals("FeatureCollection")
        || !response.path("features").isArray()) throw invalid();
    Map<String, SportingObservation.Locality> candidates = new LinkedHashMap<>();
    boolean municipalCandidate = false;
    for (JsonNode feature : response.path("features")) {
      JsonNode properties = feature.path("properties");
      JsonNode coordinates = feature.path("geometry").path("coordinates");
      String type = properties.path("type").asString();
      String code = properties.path("citycode").asString();
      if (!feature.path("type").asString().equals("Feature")
          || !(municipal
              ? type.equals("municipality")
              : Set.of("housenumber", "street", "locality", "municipality").contains(type))
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
      if (!municipal && type.equals("municipality")) {
        municipalCandidate = true;
        continue;
      }
      String identity = municipal ? code : properties.path("id").asString();
      if (identity.isBlank()) throw invalid();
      SportingObservation.Locality previous = candidates.putIfAbsent(identity, point);
      if (previous != null && !previous.equals(point)) throw invalid();
    }
    if (candidates.isEmpty())
      return new SportingObservation.Locality(revision, GeocodingOutcomeEnum.EMPTY, null, null);
    if (!municipalCandidate && candidates.size() == 1 && response.path("features").size() < 50)
      return candidates.values().iterator().next();
    return new SportingObservation.Locality(revision, GeocodingOutcomeEnum.AMBIGUOUS, null, null);
  }

  /** Returns a fixed safe category rather than the provider body, municipality or request URL. */
  private static IllegalArgumentException invalid() {
    return new IllegalArgumentException("Unqualified IGN geocoding response");
  }
}
