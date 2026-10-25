package com.blockout.backend.notifications.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.domain.MaintenanceRequiredException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.notifications.application.InboxReadStore;
import com.blockout.backend.notifications.application.MarkNotificationRead;
import com.blockout.backend.notifications.application.NotificationNotFoundException;
import com.blockout.backend.notifications.application.ReadInbox;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** HTTP binding/security with controlled application reads; SQL is qualified separately. */
@WebMvcTest(controllers = NotificationsController.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  NotificationRequest.class,
  NotificationApiMapperImpl.class,
  com.blockout.backend.sporting.api.ConsultationApiMapperImpl.class,
  NotificationExceptionHandler.class
})
@DisplayName("Owner inbox HTTP operations")
class NotificationsWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID ID = UUID.fromString("10000000-0000-4000-8000-000000000001");
  private static final String COLLECTION = "/accounts/" + ACCOUNT + "/notifications";
  @Autowired private MockMvc mvc;
  @MockitoBean private CurrentAccount account;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private MaintenanceAdmission admission;
  @MockitoBean private ReadInbox reads;
  @MockitoBean private MarkNotificationRead marks;

  @Test
  @DisplayName("Returns an exhausted empty owner page with no total or null cursor")
  void listsOwner() throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);
    when(reads.page(any(), isNull())).thenReturn(new InboxReadStore.Page(List.of(), null));

    // When
    mvc.perform(get(COLLECTION).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.notifications").isEmpty())
        .andExpect(jsonPath("$.nextCursor").doesNotExist())
        .andExpect(jsonPath("$.total").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"read\":false}",
        "{\"read\":null}",
        "{\"read\":true,\"opened\":true}",
        "{\"read\":\"true\"}"
      })
  @DisplayName("Rejects unsupported read documents before the write")
  void rejectsReadDocument(String body) throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);

    // When
    mvc.perform(
            patch(COLLECTION + "/" + ID)
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        // Then
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
    verifyNoInteractions(marks);
  }

  @Test
  @DisplayName("Member GET leaves unread unchanged and PATCH returns the confirmed true state")
  void readsThenMarks() throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);
    when(reads.member(any(), eq(ID))).thenReturn(entry(false));
    when(marks.mark(any(), eq(ID))).thenReturn(entry(true));

    // When / Then
    mvc.perform(
            get(COLLECTION + "/" + ID).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        .andExpect(status().isOk())
        .andExpect(header().string("Accept-Patch", "application/json"))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.read").value(false))
        .andExpect(jsonPath("$.match.id").value(ID.toString()))
        .andExpect(jsonPath("$.division.name").value("Division"))
        .andExpect(
            jsonPath("$.title")
                .value(org.hamcrest.Matchers.containsString("Le lien n’est plus proposé.")));
    verifyNoInteractions(marks);
    for (int repetition = 0; repetition < 2; repetition++) {
      mvc.perform(
              patch(COLLECTION + "/" + ID)
                  .with(jwt().jwt(token -> token.claim("azp", "mobile-test")))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"read\":true}"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.read").value(true))
          .andExpect(header().string("Accept-Patch", "application/json"))
          .andExpect(header().string("Cache-Control", "no-store"));
    }
  }

  @Test
  @DisplayName("Zero summary omits expiry and all successful private responses forbid storage")
  void summarizesOwner() throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);
    when(reads.summary(any())).thenReturn(new InboxReadStore.Summary(0, null));

    // When / Then
    mvc.perform(
            get("/accounts/" + ACCOUNT + "/notification-summary")
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.unreadCount").value(0))
        .andExpect(jsonPath("$.nextExpiryAt").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "?cursor=bad",
        "?cursor=",
        "?cursor=one&cursor=two",
        "?opened=true",
        "?total=true"
      })
  @DisplayName("Rejects malformed collection/query intent before database selection")
  void rejectsCursor(String query) throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);

    // When / Then
    mvc.perform(get(COLLECTION + query).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"))
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(reads, marks);
  }

  @Test
  @DisplayName("Hides missing, expired or restricted members through the canonical 404")
  void hidesMember() throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);
    when(reads.member(any(), eq(ID))).thenThrow(new NotificationNotFoundException());
    when(marks.mark(any(), eq(ID))).thenThrow(new NotificationNotFoundException());

    // When / Then
    mvc.perform(
            get(COLLECTION + "/" + ID).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:not-found"));
    mvc.perform(
            patch(COLLECTION + "/" + ID)
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"read\":true}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:not-found"));
  }

  @Test
  @DisplayName("Refuses foreign owners on collection/member/summary/mark operations")
  void refusesForeignOwner() throws Exception {
    // Given
    when(account.id()).thenReturn(UUID.fromString("00000000-0000-4000-8000-000000000002"));

    // When / Then
    for (String path :
        List.of(
            COLLECTION, COLLECTION + "/" + ID, "/accounts/" + ACCOUNT + "/notification-summary")) {
      mvc.perform(get(path).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
          .andExpect(status().isNotFound())
          .andExpect(header().string("Cache-Control", "no-store"));
    }
    mvc.perform(
            patch(COLLECTION + "/" + ID)
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"read\":true}"))
        .andExpect(status().isNotFound());
    verifyNoInteractions(reads, marks);
  }

  @Test
  @DisplayName("Storage failures remain unavailable, distinct from an empty inbox")
  void preservesUnavailable() throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);
    when(reads.page(any(), isNull()))
        .thenThrow(new DataAccessResourceFailureException("private diagnostic"));

    // When / Then
    mvc.perform(get(COLLECTION).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Unexpected SQL faults retain the shared HTTP failure outcome")
  void preservesUnexpectedFailure() throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);
    when(reads.page(any(), isNull()))
        .thenThrow(new InvalidDataAccessResourceUsageException("private SQL diagnostic"));

    // When / Then
    mvc.perform(get(COLLECTION).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.type").value("about:blank"))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("No manual notification deletion or other PATCH media is exposed")
  void refusesUnsupportedActions() throws Exception {
    // Given / When / Then
    mvc.perform(
            delete(COLLECTION + "/" + ID)
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        .andExpect(status().isMethodNotAllowed());
    mvc.perform(
            patch(COLLECTION + "/" + ID)
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test")))
                .contentType("application/merge-patch+json")
                .content("{\"read\":true}"))
        .andExpect(status().isUnsupportedMediaType());
    verifyNoInteractions(marks);
  }

  @Test
  @DisplayName("Guests and maintenance refusals never reach the owner inbox reader")
  void enforcesAdmission() throws Exception {
    // Given / When / Then
    mvc.perform(get(COLLECTION)).andExpect(status().isUnauthorized());
    doThrow(new MaintenanceRequiredException(new MaintenanceSettings(7L, true, "Pause", null)))
        .when(admission)
        .requireOrdinaryAccess(anyString(), anyString(), eq(false));
    mvc.perform(
            get(COLLECTION)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .subject("auth0|owner")
                                    .claim("azp", "mobile-test"))))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"))
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(reads, marks);
  }

  /**
   * Creates a synthetic retained allocation with explicit scenario ownership and age.
   *
   * @param read scenario's confirmed read bit
   * @return valid detached current facts for transport mapping
   */
  private static InboxReadStore.Entry entry(boolean read) {
    ConsultationViews.Division division =
        new ConsultationViews.Division(ACCOUNT, "Division", null, "#112233", null);
    ConsultationViews.PoolSummary pool =
        new ConsultationViews.PoolSummary(
            new ConsultationViews.Identity(ACCOUNT, "Pool", null, null),
            new SeasonView(ACCOUNT, 2026, "2026/2027"),
            new ConsultationViews.Classification(division, null, null),
            null,
            null);
    ConsultationViews.MatchSummary match =
        new ConsultationViews.MatchSummary(
            ID,
            pool,
            new ConsultationViews.Identity(ACCOUNT, "Home", null, null),
            new ConsultationViews.Identity(ID, "Away", null, null),
            new ConsultationViews.Schedule(
                LocalDate.of(2026, 10, 24),
                null,
                null,
                Instant.parse("2026-10-24T11:00:00Z").atOffset(java.time.ZoneOffset.UTC)),
            CalendarCategoryEnum.COMPLETED,
            null);
    return new InboxReadStore.Entry(
        ID,
        Instant.parse("2026-10-24T12:00:00.123456Z"),
        NotificationFamily.ENRICHED_RESULT,
        NotificationVariant.FIRST,
        read,
        match,
        false);
  }
}
