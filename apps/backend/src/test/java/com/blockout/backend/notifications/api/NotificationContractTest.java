package com.blockout.backend.notifications.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.api.NotificationsApi;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.MarkNotificationReadRequest;
import com.blockout.backend.generated.mobile.model.MatchResultResponse;
import com.blockout.backend.generated.mobile.model.MatchScheduleResponse;
import com.blockout.backend.generated.mobile.model.MatchSummaryResponse;
import com.blockout.backend.generated.mobile.model.NotificationFamilyEnum;
import com.blockout.backend.generated.mobile.model.NotificationResponse;
import com.blockout.backend.generated.mobile.model.NotificationSummaryResponse;
import com.blockout.backend.generated.mobile.model.NotificationsResponse;
import com.blockout.backend.generated.mobile.model.PoolSummaryResponse;
import com.blockout.backend.generated.mobile.model.PushSubscriptionResponse;
import com.blockout.backend.generated.mobile.model.ReplacePushSubscriptionRequest;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.SportingClassificationResponse;
import com.blockout.backend.generated.mobile.model.SportingDivisionResponse;
import com.blockout.backend.generated.mobile.model.SportingIdentityResponse;
import com.blockout.backend.generated.mobile.model.SportingSeasonResponse;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Validator;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Generated Java binding through a test-only adapter; no production notification endpoints. */
@WebMvcTest(controllers = NotificationContractTest.Adapter.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  NotificationRequest.class,
  NotificationContractTest.Adapter.class
})
@DisplayName("Notification generated contracts")
class NotificationContractTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000237");
  private static final String ROOT = "/accounts/" + ID;
  @Autowired private MockMvc mvc;
  @Autowired private JsonMapper json;
  @Autowired private Validator validator;
  @MockitoBean private CurrentAccount currentAccount;

  @ParameterizedTest
  @ValueSource(strings = {"result", "result-with-link", "live-link", "post-result-link"})
  @DisplayName(
      "Serializes each finite family with original microseconds and shared sporting values")
  void serializesFamily(String family) throws Exception {
    // Given
    NotificationResponse entry = entry(NotificationFamilyEnum.fromValue(family));
    entry.putAdditionalProperty("future", true);
    entry.getMatch().putAdditionalProperty("future", true);

    // When
    JsonNode encoded = json.readTree(json.writeValueAsString(entry));

    // Then
    assertThat(encoded.path("family").asString()).isEqualTo(family);
    assertThat(encoded.path("id").asString()).isEqualTo(ID.toString());
    assertThat(encoded.path("createdAt").asString()).isEqualTo("2026-10-24T01:02:03.123456Z");
    assertThat(encoded.at("/match/result/homeSets").isMissingNode()).isTrue();
    assertThat(encoded.at("/match/schedule/instant").isMissingNode()).isTrue();
    assertThat(encoded.at("/match/schedule/localDate").asString()).isEqualTo("2026-10-24");
    assertThat(encoded.at("/division/gradient").isNull()).isTrue();
    assertThat(encoded.path("future").asBoolean()).isTrue();
    assertThat(encoded.at("/match/future").asBoolean()).isTrue();
    assertThat(validator.validate(entry)).isEmpty();
  }

  @Test
  @DisplayName("Rejects unknown families without inventing compatibility")
  void rejectsUnknownFamily() {
    // Given / When / Then
    org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> json.readValue("\"future\"", NotificationFamilyEnum.class))
        .isInstanceOf(tools.jackson.core.JacksonException.class);
  }

  @Test
  @DisplayName("Keeps twenty entries with an absent end cursor")
  void preservesPageBoundary() throws Exception {
    // Given / When
    mvc.perform(get(ROOT + "/notifications"))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.notifications.length()").value(20))
        .andExpect(jsonPath("$.nextCursor").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Serializes the authored int64 count with its precise expiry")
  void preservesSummaryPrecision() throws Exception {
    // Given / When
    mvc.perform(get(ROOT + "/notification-summary"))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(4294967296L))
        .andExpect(jsonPath("$.nextExpiryAt").value("2026-11-22T01:02:03.123456Z"));
  }

  @Test
  @DisplayName("Omits expiry for a zero-count summary")
  void omitsZeroExpiry() {
    // Given
    NotificationSummaryResponse summary = new NotificationSummaryResponse(0L);

    // When
    JsonNode encoded = json.readTree(json.writeValueAsString(summary));

    // Then
    assertThat(encoded.path("unreadCount").isIntegralNumber()).isTrue();
    assertThat(encoded.path("unreadCount").asLong()).isZero();
    assertThat(encoded.path("nextExpiryAt").isMissingNode()).isTrue();
  }

  @Test
  @DisplayName("Rejects arrays beyond twenty entries through generated constraints")
  void validatesPageBound() {
    // Given
    List<NotificationResponse> entries =
        new ArrayList<>(java.util.Collections.nCopies(20, entry(NotificationFamilyEnum.RESULT)));

    // When / Then
    assertThat(validator.validate(new NotificationsResponse(entries))).isEmpty();
    entries.add(entry(NotificationFamilyEnum.RESULT));
    assertThat(validator.validate(new NotificationsResponse(entries))).isNotEmpty();
  }

  @Test
  @DisplayName("Rejects negative counts through generated constraints")
  void validatesSummaryBound() {
    // Given
    NotificationSummaryResponse summary = new NotificationSummaryResponse(-1L);

    // When / Then
    assertThat(validator.validate(summary)).isNotEmpty();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "null",
        "{\"read\":null}",
        "{\"read\":false}",
        "{\"read\":\"true\"}",
        "{\"read\":1}",
        "{\"read\":true,\"opened\":true}"
      })
  @DisplayName("Rejects every unsupported read intent at the generated HTTP boundary")
  void rejectsReadIntent(String body) throws Exception {
    // Given / When
    mvc.perform(
            patch(ROOT + "/notifications/" + ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        // Then
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
  }

  @Test
  @DisplayName("Accepts true intent without an opened state")
  void acceptsReadIntent() throws Exception {
    // Given / When
    mvc.perform(
            patch(ROOT + "/notifications/" + ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"read\":true}"))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.read").value(true))
        .andExpect(jsonPath("$.opened").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "null",
        "{\"installationId\":null,\"expoPushToken\":\"synthetic\"}",
        "{\"installationId\":\"invalid\",\"expoPushToken\":\"synthetic\"}",
        "{\"installationId\":\"00000000-0000-4000-8000-000000000237\",\"expoPushToken\":null}",
        "{\"installationId\":\"00000000-0000-4000-8000-000000000237\",\"expoPushToken\":\"\"}",
        "{\"installationId\":\"00000000-0000-4000-8000-000000000237\",\"expoPushToken\":\"synthetic\",\"accountId\":\"foreign\"}"
      })
  @DisplayName("Rejects incomplete, null or extra destination request fields")
  void rejectsRegistration(String body) throws Exception {
    // Given / When
    mvc.perform(
            put(ROOT + "/push-subscriptions/" + ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        // Then
        .andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"?cursor=", "?cursor=one&cursor=two", "?opened=true", "?accountId=foreign"})
  @DisplayName("Rejects undeclared or repeated collection parameters")
  void rejectsQueries(String query) throws Exception {
    // Given / When
    mvc.perform(get(ROOT + "/notifications" + query))
        // Then
        .andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/notification-summary?cursor=opaque",
        "/notifications/00000000-0000-4000-8000-000000000237?future=true"
      })
  @DisplayName("Only the collection accepts a cursor query parameter")
  void rejectsMemberQueries(String path) throws Exception {
    // Given / When
    mvc.perform(get(ROOT + path))
        // Then
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Returns created association identities without echoing the private address")
  void preservesSubscriptionProjection() throws Exception {
    // Given / When
    mvc.perform(
            put(ROOT + "/push-subscriptions/" + ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"installationId\":\"" + ID + "\",\"expoPushToken\":\"synthetic\"}"))
        // Then
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", ROOT + "/push-subscriptions/" + ID))
        .andExpect(jsonPath("$.id").value(ID.toString()))
        .andExpect(jsonPath("$.expoPushToken").doesNotExist());
  }

  @Test
  @DisplayName("Returns 204 without a removal representation")
  void preservesNoContentRemoval() throws Exception {
    // Given / When
    mvc.perform(delete(ROOT + "/push-subscriptions/" + ID))
        // Then
        .andExpect(status().isNoContent())
        .andExpect(content().string(""));
  }

  @Test
  @DisplayName("Provides no manual notification deletion operation")
  void refusesManualDeletion() throws Exception {
    // Given / When
    mvc.perform(delete(ROOT + "/notifications/" + ID))
        // Then
        .andExpect(status().isMethodNotAllowed());
  }

  /**
   * Builds real generated F03 summaries without inventing scores or kickoff instants.
   *
   * @param family exact canonical composition under test
   * @return a valid generated response with known sporting absences
   */
  private static NotificationResponse entry(NotificationFamilyEnum family) {
    OffsetDateTime created = OffsetDateTime.parse("2026-10-24T01:02:03.123456Z");
    MatchSummaryResponse match =
        new MatchSummaryResponse(
                ID,
                new PoolSummaryResponse(
                    new SportingIdentityResponse(ID, "Pool"),
                    new SportingSeasonResponse(ID, "2026–2027", 2026L),
                    new SportingClassificationResponse()),
                new SportingIdentityResponse(ID, "Home"),
                new SportingIdentityResponse(ID, "Away"),
                new MatchScheduleResponse(LocalDate.of(2026, 10, 24), created)
                    .timeZone("Europe/Paris"),
                CalendarCategoryEnum.COMPLETED)
            .result(
                new MatchResultResponse(ResultStateEnum.FINAL, created).specialLabel("Forfait"));
    return new NotificationResponse(
        ID,
        created,
        family,
        false,
        "Le résultat est disponible",
        match,
        new SportingDivisionResponse(ID, "Division", "#112233", null));
  }

  /** Only binds generated interfaces; business persistence and delivery remain later tasks. */
  @RestController
  static class Adapter implements NotificationsApi {
    private final NotificationRequest requests;
    private final HttpServletRequest request;

    /**
     * Uses native servlet request and the F07 binding checks.
     *
     * @param requests handwritten checks beyond generated binding
     * @param request native request retaining raw query multiplicity
     */
    Adapter(NotificationRequest requests, HttpServletRequest request) {
      this.requests = requests;
      this.request = request;
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<NotificationsResponse> listNotifications(
        UUID accountId, String cursor, Boolean bypass) {
      requests.validateQuery(request, true);
      return ResponseEntity.ok()
          .header("Cache-Control", "no-store")
          .body(
              new NotificationsResponse(
                  java.util.Collections.nCopies(20, entry(NotificationFamilyEnum.RESULT))));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<NotificationResponse> getNotification(
        UUID accountId, UUID notificationId, Boolean bypass) {
      requests.validateQuery(request, false);
      return ResponseEntity.ok(entry(NotificationFamilyEnum.RESULT));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<NotificationSummaryResponse> getNotificationSummary(
        UUID accountId, Boolean bypass) {
      requests.validateQuery(request, false);
      return ResponseEntity.ok(
          new NotificationSummaryResponse(4294967296L)
              .nextExpiryAt(OffsetDateTime.parse("2026-11-22T01:02:03.123456Z")));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<NotificationResponse> markNotificationRead(
        UUID accountId, UUID notificationId, MarkNotificationReadRequest body, Boolean bypass) {
      requests.validateQuery(request, false);
      requests.requireRead(body);
      return ResponseEntity.ok(entry(NotificationFamilyEnum.RESULT).read(true));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<PushSubscriptionResponse> replacePushSubscription(
        UUID accountId, UUID subscriptionId, ReplacePushSubscriptionRequest body, Boolean bypass) {
      requests.validateQuery(request, false);
      return ResponseEntity.created(
              java.net.URI.create(ROOT + "/push-subscriptions/" + subscriptionId))
          .body(new PushSubscriptionResponse(subscriptionId, body.getInstallationId()));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> deletePushSubscription(
        UUID accountId, UUID subscriptionId, Boolean bypass) {
      requests.validateQuery(request, false);
      return ResponseEntity.noContent().build();
    }
  }
}
