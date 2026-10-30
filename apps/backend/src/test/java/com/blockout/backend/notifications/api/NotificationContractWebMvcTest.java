package com.blockout.backend.notifications.api;

import static com.blockout.backend.notifications.api.NotificationContractFixture.ID;
import static com.blockout.backend.notifications.api.NotificationContractFixture.entry;
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
import com.blockout.backend.generated.mobile.api.PushSubscriptionsApi;
import com.blockout.backend.generated.mobile.model.MarkNotificationReadRequest;
import com.blockout.backend.generated.mobile.model.NotificationFamilyEnum;
import com.blockout.backend.generated.mobile.model.NotificationResponse;
import com.blockout.backend.generated.mobile.model.NotificationSummaryResponse;
import com.blockout.backend.generated.mobile.model.NotificationsResponse;
import com.blockout.backend.generated.mobile.model.PushSubscriptionResponse;
import com.blockout.backend.generated.mobile.model.ReplacePushSubscriptionRequest;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.time.OffsetDateTime;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.RestController;

/**
 * Generated Java binding through a test-only adapter; production controller behavior belongs to
 * NotificationsWebMvcTest.
 */
@WebMvcTest(controllers = NotificationContractWebMvcTest.Adapter.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  NotificationRequest.class,
  NotificationContractWebMvcTest.Adapter.class
})
@DisplayName("Notification generated contracts")
class NotificationContractWebMvcTest {
  private static final String ROOT = "/accounts/" + ID;
  @Autowired private MockMvc mvc;
  @MockitoBean private CurrentAccount currentAccount;

  @Test
  @DisplayName("Keeps twenty entries with an absent end cursor")
  void preservesPageBoundary() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(ROOT + "/notifications");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.notifications.length()").value(20))
        .andExpect(jsonPath("$.nextCursor").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Serializes the authored int64 count with its precise expiry")
  void preservesSummaryPrecision() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(ROOT + "/notification-summary");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(4294967296L))
        .andExpect(jsonPath("$.nextExpiryAt").value("2026-11-22T01:02:03.123456Z"));
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
    // Given
    MockHttpServletRequestBuilder request =
        patch(ROOT + "/notifications/" + ID).contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
  }

  @Test
  @DisplayName("Accepts true intent without an opened state")
  void acceptsReadIntent() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        patch(ROOT + "/notifications/" + ID)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"read\":true}");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
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
    // Given
    MockHttpServletRequestBuilder request =
        put(ROOT + "/push-subscriptions/" + ID)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(strings = {"?opened=true", "?accountId=foreign"})
  @DisplayName("Ignores undeclared query parameters through ordinary MVC binding")
  void ignoresUndeclaredQueries(String query) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(ROOT + "/notifications" + query);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isOk());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/notification-summary?cursor=opaque",
        "/notifications/00000000-0000-4000-8000-000000000237?future=true"
      })
  @DisplayName("Ignores undeclared member query parameters")
  void ignoresMemberQueries(String path) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(ROOT + path);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isOk());
  }

  @Test
  @DisplayName("Returns created association identities without echoing the private address")
  void preservesSubscriptionProjection() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        put(ROOT + "/push-subscriptions/" + ID)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"installationId\":\"" + ID + "\",\"expoPushToken\":\"synthetic\"}");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", ROOT + "/push-subscriptions/" + ID))
        .andExpect(jsonPath("$.id").value(ID.toString()))
        .andExpect(jsonPath("$.expoPushToken").doesNotExist());
  }

  @Test
  @DisplayName("Returns 204 without a removal representation")
  void preservesNoContentRemoval() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = delete(ROOT + "/push-subscriptions/" + ID);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isNoContent()).andExpect(content().string(""));
  }

  @Test
  @DisplayName("Provides no manual notification deletion operation")
  void refusesManualDeletion() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = delete(ROOT + "/notifications/" + ID);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isMethodNotAllowed());
  }

  /**
   * Binds generated interfaces with controlled response values; no business persistence or
   * delivery.
   */
  @RestController
  static class Adapter implements NotificationsApi, PushSubscriptionsApi {
    private final NotificationRequest requests;

    /**
     * Uses the F07 semantic binding checks.
     *
     * @param requests handwritten checks beyond generated binding
     */
    Adapter(NotificationRequest requests) {
      this.requests = requests;
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<NotificationsResponse> listNotifications(
        UUID accountId, String cursor, Boolean bypass) {
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
      return ResponseEntity.ok(entry(NotificationFamilyEnum.RESULT));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<NotificationSummaryResponse> getNotificationSummary(
        UUID accountId, Boolean bypass) {
      return ResponseEntity.ok(
          new NotificationSummaryResponse(4294967296L)
              .nextExpiryAt(OffsetDateTime.parse("2026-11-22T01:02:03.123456Z")));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<NotificationResponse> markNotificationRead(
        UUID accountId, UUID notificationId, MarkNotificationReadRequest body, Boolean bypass) {
      requests.requireRead(body);
      return ResponseEntity.ok(entry(NotificationFamilyEnum.RESULT).read(true));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<PushSubscriptionResponse> replacePushSubscription(
        UUID accountId, UUID subscriptionId, ReplacePushSubscriptionRequest body, Boolean bypass) {
      return ResponseEntity.created(
              java.net.URI.create(ROOT + "/push-subscriptions/" + subscriptionId))
          .body(new PushSubscriptionResponse(subscriptionId, body.getInstallationId()));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> deletePushSubscription(
        UUID accountId, UUID subscriptionId, Boolean bypass) {
      return ResponseEntity.noContent().build();
    }
  }
}
