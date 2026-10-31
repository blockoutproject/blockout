package com.blockout.backend.notifications.api;

import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.ACCOUNT;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.NOW;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.OTHER;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.entry;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.reset;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.generated.mobile.model.NotificationResponse;
import com.blockout.backend.generated.mobile.model.NotificationsResponse;
import com.blockout.backend.notifications.application.PurgeNotifications;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

/**
 * Real generated HTTP bindings, F03/F05/F12 owners and migrated SQL; only time/JWT I/O is
 * controlled.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Actual owner inbox traversal and match targets")
class InboxTraversalIntegrationTest {
  private static final String COLLECTION = "/accounts/" + ACCOUNT + "/notifications";
  private static final String SUMMARY = "/accounts/" + ACCOUNT + "/notification-summary";
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper json;
  @Autowired private PurgeNotifications purge;
  @MockitoBean private Clock clock;

  /**
   * Resets only this context's disposable records and controls the original elapsed-age clock.
   *
   * @throws Exception if the isolated database fixture cannot be reset
   */
  @BeforeEach
  void owners() throws Exception {
    reset(database, sql);
    when(clock.instant()).thenReturn(NOW);
  }

  @Test
  @DisplayName("Traverses twenty-row tied windows after anchor removal, insertion and withdrawal")
  void traversesChangingPages() throws Exception {
    // Given
    List<UUID> ids = new ArrayList<>();
    for (int number = 1; number <= 43; number++)
      ids.add(entry(sql, number, ACCOUNT, NOW.minusSeconds(60)));
    Collections.reverse(ids);
    NotificationsResponse first = page(null);
    assertThat(first.getNotifications())
        .extracting(NotificationResponse::getId)
        .containsExactlyElementsOf(ids.subList(0, 20));

    // When: these committed changes occur between actual HTTP requests, without a snapshot promise.
    sql.update("DELETE FROM notification WHERE id=?", ids.get(19));
    UUID newest = entry(sql, 100, ACCOUNT, NOW);
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", ids.get(21));
    sql.update("UPDATE sporting_match SET home_sets=1, away_sets=3 WHERE id=?", ids.get(20));
    NotificationsResponse second = page(first.getNextCursor());
    NotificationsResponse last = page(second.getNextCursor());

    // Then
    List<UUID> remaining = new ArrayList<>(ids.subList(20, 43));
    remaining.remove(ids.get(21));
    assertThat(second.getNotifications()).hasSize(20);
    assertThat(second.getNotifications().getFirst().getMatch().getResult().getHomeSets())
        .isEqualTo(1);
    assertThat(second.getNotifications().getFirst().getCreatedAt().toInstant())
        .isEqualTo(NOW.minusSeconds(60));
    List<UUID> traversed = new ArrayList<>();
    second.getNotifications().forEach(row -> traversed.add(row.getId()));
    last.getNotifications().forEach(row -> traversed.add(row.getId()));
    assertThat(traversed).containsExactlyElementsOf(remaining).doesNotHaveDuplicates();
    assertThat(last.getNextCursor()).isNull();
    assertThat(page(null).getNotifications().getFirst().getId()).isEqualTo(newest);
  }

  @Test
  @DisplayName("Corrects current facts without changing a confirmed read or its original position")
  void preservesReadThroughCorrection() throws Exception {
    // Given
    UUID older = entry(sql, 1, ACCOUNT, NOW.minusSeconds(60));
    UUID newer = entry(sql, 2, ACCOUNT, NOW);
    mvc.perform(get(COLLECTION + "/" + older).with(principal("one")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.read").value(false));
    mvc.perform(
            patch(COLLECTION + "/" + older)
                .with(principal("one"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"read\":true}"))
        .andExpect(status().isOk());
    NotificationResponse before = page(null).getNotifications().getLast();

    // When
    sql.update("UPDATE sporting_match SET home_sets=1, away_sets=3 WHERE id=?", older);
    mvc.perform(
            patch(COLLECTION + "/" + older)
                .with(principal("one"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"read\":true}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.read").value(true));
    NotificationsResponse corrected = page(null);

    // Then
    assertThat(corrected.getNotifications())
        .extracting(NotificationResponse::getId)
        .containsExactly(newer, older);
    NotificationResponse after = corrected.getNotifications().getLast();
    assertThat(after.getRead()).isTrue();
    assertThat(after.getCreatedAt()).isEqualTo(before.getCreatedAt());
    assertThat(after.getFamily()).isEqualTo(before.getFamily());
    assertThat(after.getMatch().getResult().getHomeSets()).isEqualTo(1);
    mvc.perform(get("/matches/" + older))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.match.result.homeSets").value(1));

    // When: a destination refusal after the successful PATCH cannot undo persistence.
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", older);
    mvc.perform(get("/matches/" + older)).andExpect(status().isNotFound());

    // Then
    assertThat(
            sql.queryForObject("SELECT is_read FROM notification WHERE id=?", Boolean.class, older))
        .isTrue();
  }

  @Test
  @DisplayName(
      "Counts seven across pages with two loaded, then reflects real read, purge and hiding")
  void summarizesUnloadedChanges() throws Exception {
    // Given: only IDs 24/25 are unread in page one; unread IDs 1–5 lie beyond its twenty rows.
    List<UUID> ids = new ArrayList<>();
    for (int number = 1; number <= 25; number++)
      ids.add(
          entry(
              sql,
              number,
              ACCOUNT,
              number == 1 ? NOW.minus(Duration.ofDays(29)).plusSeconds(1) : NOW.minusSeconds(60)));
    for (int number = 6; number <= 23; number++)
      sql.update("UPDATE notification SET is_read=TRUE WHERE id=?", ids.get(number - 1));
    NotificationsResponse loaded = page(null);
    assertThat(loaded.getNotifications().stream().filter(row -> !row.getRead()).count())
        .isEqualTo(2);
    mvc.perform(get(SUMMARY).with(principal("one")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(7));

    // When
    mvc.perform(
            patch(COLLECTION + "/" + ids.get(24))
                .with(principal("one"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"read\":true}"))
        .andExpect(status().isOk());
    when(clock.instant()).thenReturn(NOW.plusSeconds(1));
    purge.run();
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", ids.get(1));

    // Then
    mvc.perform(get(SUMMARY).with(principal("one")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(4));
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM notification WHERE id=?", Long.class, ids.getFirst()))
        .isZero();
    assertThat(
            sql.queryForObject(
                "SELECT is_read FROM notification WHERE id=?", Boolean.class, ids.get(24)))
        .isTrue();

    // When
    when(clock.instant()).thenReturn(NOW.plus(Duration.ofDays(29)));
    purge.run();

    // Then
    mvc.perform(get(SUMMARY).with(principal("one")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(0))
        .andExpect(jsonPath("$.nextExpiryAt").doesNotExist());
    assertThat(page(null).getNotifications()).isEmpty();
    mvc.perform(
            patch(COLLECTION + "/" + ids.getFirst())
                .with(principal("one"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"read\":true}"))
        .andExpect(status().isNotFound());
    mvc.perform(get("/matches/" + ids.getFirst())).andExpect(status().isOk());
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
  }

  @ParameterizedTest
  @ValueSource(strings = {"guest", "missing", "foreign", "moderator", "pro"})
  @DisplayName("Refuses personal operations without the usable original owner")
  void refusesForeignInbox(String actor) throws Exception {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW);
    if (actor.equals("moderator"))
      sql.update(
          "INSERT INTO account_permission(account_id,permission) VALUES (?,'stream-links.moderate')",
          OTHER);
    RequestPostProcessor caller = principal(actor.equals("missing") ? "absent" : "two");
    if (actor.equals("pro"))
      caller =
          jwt()
              .jwt(
                  token ->
                      token
                          .issuer("https://identity.example.invalid/")
                          .subject("two")
                          .claim("azp", "mobile-test")
                          .claim("pro", true));
    List<MockHttpServletRequestBuilder> requests =
        List.of(
            get(COLLECTION),
            get(SUMMARY),
            get(COLLECTION + "/" + id),
            patch(COLLECTION + "/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"read\":true}"));

    // When
    for (MockHttpServletRequestBuilder request : requests) {
      if (!actor.equals("guest")) request.with(caller);
      mvc.perform(request)
          // Then: foreign ownership is deliberately indistinguishable from absence.
          .andExpect(status().is(actor.equals("guest") ? 401 : actor.equals("missing") ? 403 : 404))
          .andExpect(header().string("Cache-Control", "no-store"));
    }
    assertThat(sql.queryForObject("SELECT is_read FROM notification WHERE id=?", Boolean.class, id))
        .isFalse();
  }

  /**
   * Traverses the production controller and decodes its generated transport model.
   *
   * @param cursor original opaque continuation, or absent for refresh
   * @return authorized HTTP window with no test-side sorting or filtering
   * @throws Exception if HTTP execution or generated-model decoding fails
   */
  private NotificationsResponse page(String cursor) throws Exception {
    MockHttpServletRequestBuilder request = get(COLLECTION).with(principal("one"));
    if (cursor != null) request.queryParam("cursor", cursor);
    String response =
        mvc.perform(request)
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    return json.readValue(response, NotificationsResponse.class);
  }

  /**
   * Supplies already-validated synthetic claims; signature/JWKS behavior has its own owner suite.
   *
   * @param subject exact existing or deliberately missing synthetic principal
   * @return native security context for the request only
   */
  private static RequestPostProcessor principal(String subject) {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject(subject)
                    .claim("azp", "mobile-test"));
  }
}
