package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendClient;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendMapperImpl;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationClient;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationMapperImpl;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.acquisition.lnv.LnvTeamImages;
import com.blockout.collector.config.AcquisitionConfiguration;
import com.blockout.collector.config.AcquisitionProperties;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.api.SportingApi;
import com.blockout.collector.generated.ingestion.model.GeocodingOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.collector.ingestion.IngestionTestClient;
import com.sun.net.httpserver.HttpServer;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferByte;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

/**
 * Opt-in T054 qualification through production collector orchestration, generated ingestion,
 * executable backend and migrated PostgreSQL. Calendar/municipal interpretation is controlled;
 * image acquisition uses the production provider client against a local HTTP peer. No live
 * provider, V1 or protected restoration input is accessed.
 */
@EnabledIfSystemProperty(named = "blockout.qualify-collector-sporting", matches = "true")
@DisplayName("Collector presentation and current locality acceptance")
class CollectorPresentationBoundaryIntegrationTest {
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000197");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000195");
  private static final UUID CLUB = UUID.fromString("00000000-0000-4000-8000-000000000201");
  private static final UUID SHEETS = UUID.fromString("00000000-0000-4000-8000-000000000202");
  private static final UUID GEOCODING = UUID.fromString("00000000-0000-4000-8000-000000000203");
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000204");
  private static CollectorSportingRuntime runtime;
  private final Clock clock = Clock.systemUTC();
  private final List<String> submissions = new ArrayList<>();
  private IngestionTestClient transport;
  private CollectionBackend backend;
  private SportingBackend sporting;
  private CollectorLifecycle lifecycle;
  private HttpClient mobileHttp;
  private RestClient mobile;
  private HttpServer imagePeer;
  private ProviderHttpClient imageHttp;
  private LnvTeamImages images;
  private URI imageUrl;
  private final AtomicInteger imageReads = new AtomicInteger();
  private byte[] imageBody;
  private int imageStatus = 200;

  /**
   * Starts the explicitly packaged backend against the selected disposable migrated database.
   *
   * @throws Exception if the selected local runtime cannot start
   */
  @BeforeAll
  static void startBackend() throws Exception {
    runtime = new CollectorSportingRuntime();
  }

  /**
   * Stops only this suite's backend process and local signing endpoint.
   *
   * @throws Exception if owned runtime shutdown fails
   */
  @AfterAll
  static void stopBackend() throws Exception {
    if (runtime != null) runtime.close();
  }

  /**
   * Resets disposable data and creates real collector transport plus a local mobile principal.
   *
   * @throws Exception if fixture initialization or native client setup fails
   */
  @BeforeEach
  void prepareBoundaries() throws Exception {
    try (Connection connection =
        DriverManager.getConnection(
            System.getProperty("qualification.database-url"),
            System.getProperty("qualification.migration-user"),
            System.getProperty("qualification.migration-password"))) {
      ScriptUtils.executeSqlScript(connection, new ClassPathResource("collector-sporting.sql"));
      ScriptUtils.executeSqlScript(connection, new ClassPathResource("collector-presentation.sql"));
    }
    runtime.sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
    runtime.sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?,?,?,?,?)",
        ACCOUNT,
        runtime.issuer(),
        "issue200",
        "Operator_200",
        "operator200@example.invalid");
    runtime.sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'sporting-presentation.manage')",
        ACCOUNT);
    transport =
        runtime.connect(
            (request, body, execution) -> {
              if (request.getURI().getPath().endsWith("/locality-observations"))
                submissions.add(new String(body, StandardCharsets.UTF_8));
              return execution.execute(request, body);
            });
    backend =
        new CollectionBackendClient(
            new CollectorOperationsApi(transport.api()),
            new CollectionApi(transport.api()),
            new CollectionBackendMapperImpl());
    sporting =
        new SportingObservationClient(
            new SportingApi(transport.api()), new SportingObservationMapperImpl());
    lifecycle = new CollectorLifecycle(backend);
    lifecycle.start();
    mobileHttp = HttpClient.newHttpClient();
    mobile =
        RestClient.builder()
            .baseUrl(runtime.baseUrl())
            .requestFactory(new JdkClientHttpRequestFactory(mobileHttp))
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + runtime.mobileToken("issue200"))
            .build();
    imageBody = image("png");
    imagePeer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    imagePeer.createContext(
        "/logo.jpg",
        exchange -> {
          imageReads.incrementAndGet();
          exchange.getResponseHeaders().add("Content-Type", "image/jpeg");
          exchange.getResponseHeaders().add("Cache-Control", "no-store");
          exchange.sendResponseHeaders(imageStatus, imageBody.length);
          exchange.getResponseBody().write(imageBody);
          exchange.close();
        });
    imagePeer.start();
    String origin = "http://127.0.0.1:" + imagePeer.getAddress().getPort();
    imageUrl = URI.create(origin + "/logo.jpg");
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(origin),
            List.of(origin),
            List.of(origin),
            Duration.ofSeconds(2),
            8 * 1024 * 1024,
            0,
            1,
            0,
            100,
            Duration.ofSeconds(1),
            Duration.ZERO,
            List.of());
    imageHttp = new AcquisitionConfiguration().lnvProviderClient(properties);
    images = new LnvTeamImages(imageHttp, clock);
  }

  /**
   * Releases this test's native pools and HTTP listener without touching other task resources.
   *
   * @throws Exception if owned native resources cannot close
   */
  @AfterEach
  void closeBoundaries() throws Exception {
    try {
      if (transport != null) transport.close();
    } finally {
      if (imageHttp != null) imageHttp.close();
      if (imagePeer != null) imagePeer.stop(0);
      if (mobileHttp != null) mobileHttp.close();
    }
  }

  @Test
  @DisplayName("Acquires each distinct team once across repeated matches and pools in one passage")
  void acquiresEachDistinctTeamOnce() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    LnvAcquisition lnv = professional();

    // When
    boolean completed =
        passage(lnv, mock(ClubSheets.class), mock(MunicipalGeocoder.class)).execute(cycle);

    // Then
    assertThat(completed).isTrue();
    assertThat(imageReads)
        .hasValue(2); // Two teams share one URL: deduplication is by team, not URL.
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(4);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_team WHERE source_logo IS NOT NULL AND source_logo_media_type='image/png'",
                Integer.class))
        .isEqualTo(2);
    assertThat(
            runtime.sql.queryForList(
                "SELECT outcome FROM collection_result WHERE stage='LOGO' AND phase='INTEGRATION'",
                String.class))
        .containsExactlyInAnyOrder("SUCCESS", "SUCCESS");
    assertThat(
            runtime.sql.queryForList(
                "SELECT outcome FROM collection_result WHERE stage='CALENDAR' AND phase='INTEGRATION'",
                String.class))
        .containsExactlyInAnyOrder("SUCCESS", "SUCCESS");
  }

  @ParameterizedTest
  @ValueSource(strings = {"unavailable", "corrupt", "unsupported", "oversized"})
  @DisplayName(
      "A failed image attempt retains accepted bytes without blocking matches or retrying the team")
  void preservesLastValidLogo(String failure) throws Exception {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    SportingObservation.CalendarOutcome initial =
        sporting.calendar(POOL, context(cycle), calendar());
    UUID home = initial.outcomes().getFirst().homeTeamId();
    byte[] retained = image("jpeg");
    assertThat(sporting.logo(home, context(cycle), retained).outcome())
        .isEqualTo(ObservationOutcomeEnum.ACCEPTED);
    byte[] manual = image("png");
    presentation(home, "replace", "Manual team", manual);
    switch (failure) {
      case "unavailable" -> imageStatus = 404;
      case "corrupt" -> imageBody = "not an image".getBytes(StandardCharsets.UTF_8);
      case "unsupported" -> {
        imageBody = image("gif");
        assertThat(ImageIO.read(new ByteArrayInputStream(imageBody))).isNotNull();
      }
      case "oversized" -> imageBody = oversizedImage();
      default -> throw new IllegalArgumentException(failure);
    }

    // When
    boolean completed =
        passage(professional(), mock(ClubSheets.class), mock(MunicipalGeocoder.class))
            .execute(cycle);

    // Then
    assertThat(completed).isTrue();
    assertThat(imageReads).hasValue(2);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT source_logo FROM sporting_team WHERE id=?", byte[].class, home))
        .isEqualTo(retained);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT source_logo_media_type FROM sporting_team WHERE id=?", String.class, home))
        .isEqualTo("image/jpeg");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT logo FROM sporting_team WHERE id=?", byte[].class, home))
        .isEqualTo(manual);
    assertThat(presentation(home).at("/names/effectiveName").asString()).isEqualTo("Manual team");
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(4);
    assertThat(
            runtime.sql.queryForList(
                "SELECT outcome FROM collection_result WHERE stage='CALENDAR' AND phase='INTEGRATION'",
                String.class))
        .containsExactlyInAnyOrder("SUCCESS", "SUCCESS");
    assertThat(
            runtime.sql.queryForList(
                "SELECT outcome FROM collection_result WHERE stage='LOGO' AND phase=?",
                String.class,
                failure.equals("unavailable") ? "ACQUISITION" : "INTEGRATION"))
        .containsExactlyInAnyOrder("FAILED", "FAILED");
  }

  @Test
  @DisplayName(
      "Serves the current correction after admission and commits only that locality revision")
  void acceptsCurrentLocality() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(GEOCODING, null, 0, null);
    correct(
        Map.of(
            "city",
            Map.of("mode", "manual", "value", "Lyon"),
            "postalCode",
            Map.of("mode", "manual", "value", "69001")));
    MunicipalGeocoder geocoder = mock(MunicipalGeocoder.class);
    when(geocoder.read("Lyon", "69001", "2"))
        .thenReturn(
            new SportingObservation.Locality("2", GeocodingOutcomeEnum.LOCATED, 45.76, 4.84));

    // When
    boolean completed =
        passage(mock(LnvAcquisition.class), mock(ClubSheets.class), geocoder).execute(cycle);

    // Then
    assertThat(completed).isTrue();
    verify(geocoder).read("Lyon", "69001", "2");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT geocoded_revision FROM sporting_club WHERE id=?", Long.class, CLUB))
        .isEqualTo(2);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT latitude FROM sporting_club WHERE id=?", Double.class, CLUB))
        .isEqualTo(45.76);
    assertThat(
            transport
                .api()
                .getJsonMapper()
                .readTree(submissions.getFirst())
                .path("localityRevision")
                .asString())
        .isEqualTo("2");
  }

  @Test
  @DisplayName("Rejects an in-flight old point after a real administrative locality correction")
  void rejectsLateLocality() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(GEOCODING, null, 0, null);
    MunicipalGeocoder geocoder = mock(MunicipalGeocoder.class);
    when(geocoder.read("Paris", "75001", "1"))
        .thenAnswer(
            call -> {
              correct(Map.of("city", Map.of("mode", "manual", "value", "Lyon")));
              return new SportingObservation.Locality(
                  "1", GeocodingOutcomeEnum.LOCATED, 48.86, 2.34);
            });

    // When
    boolean completed =
        passage(mock(LnvAcquisition.class), mock(ClubSheets.class), geocoder).execute(cycle);

    // Then
    assertThat(completed).isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT latitude FROM sporting_club WHERE id=?", Double.class, CLUB))
        .isNull();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT locality_revision FROM sporting_club WHERE id=?", Long.class, CLUB))
        .isEqualTo(2);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT reason FROM collection_result WHERE scope_id=? AND stage='GEOCODING' AND phase='INTEGRATION'",
                String.class,
                CLUB))
        .isEqualTo("stale");
  }

  @Test
  @DisplayName("A technical acquisition failure preserves an already committed current point")
  void preservesPointOnTechnicalFailure() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(GEOCODING, null, 0, null);
    sporting.locality(
        CLUB,
        context(cycle),
        new SportingObservation.Locality("1", GeocodingOutcomeEnum.LOCATED, 48.86, 2.34));
    int preparedSubmissions = submissions.size();
    MunicipalGeocoder geocoder = mock(MunicipalGeocoder.class);
    when(geocoder.read(anyString(), anyString(), anyString()))
        .thenThrow(new IllegalStateException("Synthetic transport failure"));

    // When
    boolean completed =
        passage(mock(LnvAcquisition.class), mock(ClubSheets.class), geocoder).execute(cycle);

    // Then
    assertThat(completed).isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT latitude FROM sporting_club WHERE id=?", Double.class, CLUB))
        .isEqualTo(48.86);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT longitude FROM sporting_club WHERE id=?", Double.class, CLUB))
        .isEqualTo(2.34);
    assertThat(submissions).hasSize(preparedSubmissions);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT outcome FROM collection_result WHERE scope_id=? AND stage='GEOCODING' AND phase='ACQUISITION'",
                String.class,
                CLUB))
        .isEqualTo("FAILED");
  }

  @Test
  @DisplayName(
      "A restriction applied after admission prevents municipal acquisition and publication")
  void respectsCurrentRestriction() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(GEOCODING, null, 0, null);
    // Manual F11 restriction has no public endpoint; seed its resulting current owner state.
    runtime.sql.update(
        "UPDATE sporting_club SET municipality=NULL,municipality_manual=NULL,municipality_restricted=TRUE,locality_revision=2,contacts_revision=1 WHERE id=?",
        CLUB);
    MunicipalGeocoder geocoder = mock(MunicipalGeocoder.class);

    // When
    boolean completed =
        passage(mock(LnvAcquisition.class), mock(ClubSheets.class), geocoder).execute(cycle);

    // Then
    assertThat(completed).isTrue();
    verifyNoInteractions(geocoder);
    assertThat(submissions).isEmpty();
    assertThat(contacts().at("/city/effectiveValue").isNull()).isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT latitude FROM sporting_club WHERE id=?", Double.class, CLUB))
        .isNull();
  }

  @Test
  @DisplayName(
      "Club collection preserves a correction, deliberate absence and current restriction independently")
  void preservesContactChoices() {
    // Given
    correct(
        Map.of(
            "city",
            Map.of("mode", "manual", "value", "Lyon"),
            "postalCode",
            Map.of("mode", "manual", "value", "69001"),
            "email",
            Map.of("mode", "hidden")));
    runtime.sql.update(
        "UPDATE sporting_club SET phone=NULL,phone_manual=NULL,phone_restricted=TRUE WHERE id=?",
        CLUB);
    CollectorLifecycle.AdmittedCycle geocoding = lifecycle.admit(GEOCODING, null, 0, null);
    sporting.locality(
        CLUB,
        context(geocoding),
        new SportingObservation.Locality("2", GeocodingOutcomeEnum.LOCATED, 45.76, 4.84));
    ClubSheets sheets = mock(ClubSheets.class);
    when(sheets.read("000200"))
        .thenReturn(
            new SportingObservation.Club(
                "Updated club",
                null,
                JsonNullable.of("Marseille"),
                JsonNullable.of("13001"),
                JsonNullable.of("source@example.invalid"),
                JsonNullable.of("0102030405"),
                JsonNullable.of("https://example.invalid")));
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(SHEETS, null, 0, null);

    // When
    boolean completed =
        passage(mock(LnvAcquisition.class), sheets, mock(MunicipalGeocoder.class)).execute(cycle);

    // Then
    assertThat(completed).isTrue();
    JsonNode current = contacts();
    assertThat(current.at("/city/effectiveValue").asString()).isEqualTo("Lyon");
    assertThat(current.at("/city/sourceValue").asString()).isEqualTo("Marseille");
    assertThat(current.at("/email/mode").asString()).isEqualTo("hidden");
    assertThat(current.at("/email/effectiveValue").isNull()).isTrue();
    assertThat(current.at("/phone/sourceValue").isNull()).isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT phone FROM sporting_club WHERE id=?", String.class, CLUB))
        .isNull();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT locality_revision FROM sporting_club WHERE id=?", Long.class, CLUB))
        .isEqualTo(2);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT latitude FROM sporting_club WHERE id=?", Double.class, CLUB))
        .isEqualTo(45.76);
    correct(Map.of("address", Map.of("mode", "manual", "value", "Synthetic street")));
    assertThat(
            runtime.sql.queryForObject(
                "SELECT locality_revision FROM sporting_club WHERE id=?", Long.class, CLUB))
        .isEqualTo(2);
  }

  @Test
  @DisplayName(
      "Real multipart PATCH refuses an invalid image without changing the name or prior bytes")
  void bindsAtomicMultipartPresentation() throws Exception {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    UUID team =
        sporting.calendar(POOL, context(cycle), calendar()).outcomes().getFirst().homeTeamId();
    byte[] source = image("png");
    sporting.logo(team, context(cycle), source);
    byte[] manual = image("jpeg");
    presentation(team, "replace", "Manual team", manual);
    String revision = presentation(team).path("revision").asString();

    // When / Then
    assertThatThrownBy(() -> presentation(team, "replace", "Rejected name", new byte[] {1, 2, 3}))
        .isInstanceOfSatisfying(
            HttpClientErrorException.class,
            failure -> assertThat(failure.getStatusCode().value()).isEqualTo(422));
    assertThat(presentation(team).path("revision").asString()).isEqualTo(revision);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT manual_name FROM sporting_team WHERE id=?", String.class, team))
        .isEqualTo("Manual team");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT logo FROM sporting_team WHERE id=?", byte[].class, team))
        .isEqualTo(manual);
  }

  @Test
  @DisplayName("Automatic multipart restoration resolves the accepted source bytes")
  void restoresAcceptedSourceLogo() throws Exception {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    UUID team =
        sporting.calendar(POOL, context(cycle), calendar()).outcomes().getFirst().homeTeamId();
    byte[] source = image("png");
    sporting.logo(team, context(cycle), source);
    presentation(team, "replace", "Manual team", image("jpeg"));

    // When
    presentation(team, "automatic", "Manual team", null);

    // Then
    JsonNode current = presentation(team);
    assertThat(current.at("/logo/manualUrl").isNull()).isTrue();
    assertThat(current.at("/logo/effectiveUrl")).isEqualTo(current.at("/logo/automaticUrl"));
    assertThat(
            mobile
                .get()
                .uri(current.at("/logo/effectiveUrl").asString())
                .retrieve()
                .body(byte[].class))
        .isEqualTo(source);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT logo FROM sporting_team WHERE id=?", byte[].class, team))
        .isNull();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT source_logo FROM sporting_team WHERE id=?", byte[].class, team))
        .isEqualTo(source);
  }

  @Test
  @DisplayName("Returning to the current source locality rejects an earlier manual-context point")
  void rejectsOldPointAfterReturnToSource() {
    // Given
    correct(Map.of("city", Map.of("mode", "manual", "value", "Lyon")));
    CollectorLifecycle.AdmittedCycle geocoding = lifecycle.admit(GEOCODING, null, 0, null);
    sporting.locality(
        CLUB,
        context(geocoding),
        new SportingObservation.Locality("2", GeocodingOutcomeEnum.LOCATED, 45.76, 4.84));
    correct(Map.of("city", Map.of("mode", "source")));

    // When
    SportingObservation.Outcome late =
        sporting.locality(
            CLUB,
            context(geocoding),
            new SportingObservation.Locality("2", GeocodingOutcomeEnum.LOCATED, 45.76, 4.84));

    // Then
    assertThat(late.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(contacts().at("/city/effectiveValue").asString()).isEqualTo("Paris");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT latitude FROM sporting_club WHERE id=?", Double.class, CLUB))
        .isNull();
  }

  /**
   * Composes the real passage; discovery is a controlled failure retaining qualified pool
   * references.
   *
   * @param lnv controlled professional interpretation and real image acquisition
   * @param sheets controlled club page proposals
   * @param geocoder controlled municipal response or failure
   * @return production orchestration with real backend clients
   */
  private CollectPassage passage(
      LnvAcquisition lnv, ClubSheets sheets, MunicipalGeocoder geocoder) {
    DiscoverSeasonSources discovery = mock(DiscoverSeasonSources.class);
    when(discovery.catalog(any(), any(), any()))
        .thenThrow(new FfvbAcquisitionException("Synthetic discovery unavailable"));
    return new CollectPassage(
        backend,
        sporting,
        mock(FfvbAcquisition.class),
        lnv,
        sheets,
        geocoder,
        discovery,
        lifecycle,
        clock,
        new CollectionStageMapperImpl());
  }

  /**
   * Supplies controlled calendar interpretation while delegating every image GET to production
   * transport.
   */
  private LnvAcquisition professional() {
    LnvAcquisition lnv = mock(LnvAcquisition.class);
    LnvAcquisition.Resource resource = mock(LnvAcquisition.Resource.class);
    when(lnv.read(any())).thenReturn(resource);
    when(lnv.documentIndexes(any())).thenReturn((target, calendar) -> null);
    when(resource.calendar(any()))
        .thenAnswer(
            call ->
                new LnvAcquisition.Calendar(
                    calendar(), Map.of("HOME", imageUrl, "AWAY", imageUrl), clock.instant(), null));
    when(lnv.image(any()))
        .thenAnswer(
            call -> {
              LnvTeamImages.Image image = images.read(call.getArgument(0));
              return image == null
                  ? null
                  : new LnvAcquisition.Read<>(image.bytes(), image.observedAt());
            });
    return lnv;
  }

  /**
   * Returns repeated attributable professional participants; pool context keeps match identities
   * distinct.
   */
  private SportingObservation.Calendar calendar() {
    SportingObservation.Team home = new SportingObservation.Team("Home", "HOME", null, null);
    SportingObservation.Team away = new SportingObservation.Team("Away", "AWAY", null, null);
    SportingObservation.Facts facts =
        SportingObservation.Facts.builder()
            .localDate(JsonNullable.of(LocalDate.of(2026, 10, 25)))
            .build();
    return new SportingObservation.Calendar(
        true,
        List.of(
            new SportingObservation.Match("M1", home, away, facts, null),
            new SportingObservation.Match("M2", away, home, facts, null)),
        List.of(),
        List.of());
  }

  /**
   * Allocates the next observation order from the actual admitted collector capability.
   *
   * @param cycle real running F01 capability
   * @return attributed context without a fabricated provider publication time
   */
  private SportingObservation.Context context(CollectorLifecycle.AdmittedCycle cycle) {
    return new SportingObservation.Context(
        cycle.getCycle().id(), cycle.nextReadOrdinal(), clock.instant(), null);
  }

  /** Reads the canonical current contact response without a parallel transport model. */
  private JsonNode contacts() {
    return mobile
        .get()
        .uri("/administration/clubs/{id}/contacts", CLUB)
        .retrieve()
        .body(JsonNode.class);
  }

  /**
   * Applies only supplied contact choices using the real current revision and controller.
   *
   * @param fields scenario-owned canonical field modes and values
   */
  private void correct(Map<String, Object> fields) {
    Map<String, Object> request = new java.util.LinkedHashMap<>(fields);
    request.put("revision", contacts().path("revision").asString());
    mobile
        .patch()
        .uri("/administration/clubs/{id}/contacts", CLUB)
        .contentType(MediaType.APPLICATION_JSON)
        .body(request)
        .retrieve()
        .toBodilessEntity();
  }

  /**
   * Reads the canonical team editor response to obtain its current opaque revision.
   *
   * @param team original team UUID
   * @return current canonical presentation projection
   */
  private JsonNode presentation(UUID team) {
    return mobile
        .get()
        .uri("/administration/teams/{id}/presentation", team)
        .retrieve()
        .body(JsonNode.class);
  }

  /**
   * Sends JSON metadata and optional bytes with Spring's native multipart converter.
   *
   * @param team original team UUID
   * @param action canonical keep/replace/automatic logo instruction
   * @param name desired manual full name
   * @param bytes image part only for replacement
   */
  private void presentation(UUID team, String action, String name, byte[] bytes) {
    MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
    HttpHeaders json = new HttpHeaders();
    json.setContentType(MediaType.APPLICATION_JSON);
    Map<String, Object> metadata = new java.util.LinkedHashMap<>();
    metadata.put("revision", presentation(team).path("revision").asString());
    metadata.put("logoAction", action);
    metadata.put("manualName", name);
    metadata.put("manualShortName", null);
    parts.add("metadata", new HttpEntity<>(metadata, json));
    if (bytes != null)
      parts.add(
          "image",
          new ByteArrayResource(bytes) {
            /** {@inheritDoc} */
            @Override
            public String getFilename() {
              return "synthetic.jpg";
            }
          });
    mobile
        .patch()
        .uri("/administration/teams/{id}/presentation", team)
        .contentType(MediaType.MULTIPART_FORM_DATA)
        .body(parts)
        .retrieve()
        .toBodilessEntity();
  }

  /**
   * Encodes a deterministic noisy PNG below the decoded-pixel and transport limits, isolating the
   * 5-MiB upload bound from corrupt-content or decompression-budget refusal.
   *
   * @return decodable PNG exceeding only the compressed image upload bound
   * @throws Exception if the standard image codec cannot encode or decode the fixture
   */
  private byte[] oversizedImage() throws Exception {
    BufferedImage image = new BufferedImage(1600, 1200, BufferedImage.TYPE_3BYTE_BGR);
    new Random(200L).nextBytes(((DataBufferByte) image.getRaster().getDataBuffer()).getData());
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    assertThat(ImageIO.write(image, "png", bytes)).isTrue();
    byte[] encoded = bytes.toByteArray();
    assertThat(encoded.length).isBetween(5_242_881, 8 * 1024 * 1024);
    BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(encoded));
    assertThat(decoded.getWidth()).isEqualTo(1600);
    assertThat(decoded.getHeight()).isEqualTo(1200);
    return encoded;
  }

  /**
   * Creates tiny PNG/JPEG fixtures and the intentional GIF rejection input with the JDK encoder.
   *
   * @param format native PNG, JPEG or GIF writer name selected by the scenario
   * @return complete valid two-by-three-pixel image bytes
   * @throws Exception if the native encoder cannot write the requested image
   */
  private byte[] image(String format) throws Exception {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    assertThat(ImageIO.write(new BufferedImage(2, 3, BufferedImage.TYPE_INT_RGB), format, bytes))
        .isTrue();
    return bytes.toByteArray();
  }
}
