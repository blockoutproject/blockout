package com.blockout.backend.accounts.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * F14 continuity through actual F05 establishment, erasure and F12 authorization with migrated
 * PostgreSQL. Only provider I/O is controlled. Linked methods supply the same authenticated
 * principal; this does not qualify Auth0 linking, token signatures or real provider cleanup.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Transition identity and current permission continuity")
class TransitionIdentityIntegrationTest {
  private static final String ISSUER = "https://identity.example.invalid/";
  private static final String SUBJECT = "google-oauth2|retained";
  private static final Instant CREATED = Instant.parse("2020-01-02T03:04:05Z");
  private static final UUID OLD = UUID.fromString("00000000-0000-4000-8000-000000000338");
  private static final List<PrincipalReader.Identity> LINKED =
      List.of(
          new PrincipalReader.Identity("google-oauth2", "google-oauth2"),
          new PrincipalReader.Identity("apple", "apple"));
  @Autowired private EstablishAccount establishment;
  @Autowired private ReadAccount accounts;
  @Autowired private EraseAccount erasure;
  @Autowired private JdbcTemplate sql;
  @Autowired private MockMvc mvc;
  @MockitoBean private PrincipalReader provider;
  @MockitoBean private AccountCleanup.Auth0 auth0Cleanup;
  @MockitoBean private AccountCleanup.RevenueCat revenueCatCleanup;

  /** Clears only this context's disposable account fixtures, without invoking provider erasure. */
  @BeforeEach
  void prepare() {
    sql.update("DELETE FROM account");
  }

  @Test
  @DisplayName("Recreates linked methods under their retained principal and actual age")
  void recreatesRetainedLinkedPrincipal() throws Exception {
    // Given
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email,principal_created_at)"
            + " VALUES (?,?,?,'Former_profile','old@example.invalid',?)",
        OLD,
        ISSUER,
        SUBJECT,
        java.sql.Timestamp.from(CREATED));
    sql.update("INSERT INTO account_permission VALUES (?,'maintenance.manage')", OLD);
    // Synthetic reset of the business fixture only; F14 does not call voluntary erasure.
    sql.update("DELETE FROM account WHERE id=?", OLD);
    when(provider.read(ISSUER, SUBJECT))
        .thenReturn(
            new PrincipalReader.Evidence("google@example.invalid", CREATED, LINKED),
            new PrincipalReader.Evidence("apple@privaterelay.example.invalid", CREATED, LINKED));

    // When
    mvc.perform(post("/accounts").with(principal(SUBJECT))).andExpect(status().isCreated());
    Account recreated = accounts.current(ISSUER, SUBJECT).account();
    mvc.perform(post("/accounts").with(principal(SUBJECT)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(recreated.id().toString()));

    // Then
    ReadAccount.View current = accounts.current(ISSUER, SUBJECT);
    assertThat(recreated.id()).isNotEqualTo(OLD);
    assertThat(current.account().subject()).isEqualTo(SUBJECT);
    assertThat(current.account().principalCreatedAt()).isEqualTo(CREATED);
    assertThat(current.account().email()).isEqualTo("apple@privaterelay.example.invalid");
    assertThat(current.account().username()).isNotEqualTo("Former_profile");
    assertThat(current.hasPhoto()).isFalse();
    assertThat(current.permissions()).isEmpty();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isEqualTo(1L);
    verifyNoInteractions(auth0Cleanup, revenueCatCleanup);
  }

  @ParameterizedTest
  @ValueSource(strings = {"shared@example.invalid", "SHARED@example.invalid"})
  @DisplayName("Keeps unlinked principals private even with the same provider email")
  void keepsUnlinkedSharedEmailSeparate(String secondEmail) throws Exception {
    // Given
    String other = "apple|unlinked";
    when(provider.read(ISSUER, SUBJECT))
        .thenReturn(new PrincipalReader.Evidence("shared@example.invalid", CREATED, LINKED));
    when(provider.read(ISSUER, other))
        .thenReturn(new PrincipalReader.Evidence(secondEmail, CREATED, List.of()));
    Account first = establishment.establish(ISSUER, SUBJECT).view().account();

    // When
    Account second = establishment.establish(ISSUER, other).view().account();

    // Then
    assertThat(second.id()).isNotEqualTo(first.id());
    assertThat(second.email()).isEqualTo(secondEmail);
    mvc.perform(get("/accounts/{id}", first.id()).with(principal(other)))
        .andExpect(status().isNotFound());
    assertThat(accounts.current(ISSUER, SUBJECT).account()).isEqualTo(first);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isEqualTo(2L);
    verifyNoInteractions(auth0Cleanup, revenueCatCleanup);
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {" "})
  @DisplayName("Suspends email-less first creation until an explicit usable-evidence retry")
  void retriesMissingEmailExplicitly(String email) throws Exception {
    // Given
    when(provider.read(ISSUER, SUBJECT))
        .thenReturn(new PrincipalReader.Evidence(email, CREATED, LINKED));

    // When
    mvc.perform(post("/accounts").with(principal(SUBJECT)))
        .andExpect(status().isUnprocessableContent())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:provider-email-unavailable"));

    // Then
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isZero();
    mvc.perform(get("/accounts/me").with(principal(SUBJECT))).andExpect(status().isNotFound());
    verify(provider).read(ISSUER, SUBJECT);

    // When
    when(provider.read(ISSUER, SUBJECT))
        .thenReturn(new PrincipalReader.Evidence("recovered@example.invalid", CREATED, LINKED));
    mvc.perform(post("/accounts").with(principal(SUBJECT))).andExpect(status().isCreated());

    // Then
    assertThat(accounts.current(ISSUER, SUBJECT).account().principalCreatedAt()).isEqualTo(CREATED);
    verifyNoInteractions(auth0Cleanup, revenueCatCleanup);
  }

  @Test
  @DisplayName("Retains known evidence during an outage and recovers unknown age only explicitly")
  void retainsTrustworthyAge() {
    // Given
    when(provider.read(ISSUER, SUBJECT))
        .thenReturn(new PrincipalReader.Evidence("known@example.invalid", null, LINKED))
        .thenThrow(new AccountUnavailableException())
        .thenReturn(new PrincipalReader.Evidence(null, CREATED, LINKED))
        .thenThrow(new AccountUnavailableException());
    Account initial = establishment.establish(ISSUER, SUBJECT).view().account();
    assertThat(initial.principalCreatedAt()).isNull();

    // When
    Account unknown = establishment.establish(ISSUER, SUBJECT).view().account();

    // Then
    assertThat(unknown.id()).isEqualTo(initial.id());
    assertThat(unknown.principalCreatedAt()).isNull();
    assertThat(unknown.email()).isEqualTo("known@example.invalid");

    // When
    Account recovered = establishment.establish(ISSUER, SUBJECT).view().account();
    Account retained = establishment.establish(ISSUER, SUBJECT).view().account();

    // Then
    assertThat(recovered.id()).isEqualTo(initial.id());
    assertThat(retained).isEqualTo(recovered);
    assertThat(retained.principalCreatedAt()).isEqualTo(CREATED);
    verifyNoInteractions(auth0Cleanup, revenueCatCleanup);
  }

  @Test
  @DisplayName("Uses current SQL grants for both projection and protected commands")
  void appliesCurrentGrants() throws Exception {
    // Given
    when(provider.read(ISSUER, SUBJECT))
        .thenReturn(new PrincipalReader.Evidence("owner@example.invalid", CREATED, LINKED));
    Account current = establishment.establish(ISSUER, SUBJECT).view().account();
    sql.update("INSERT INTO account_permission VALUES (?,'maintenance.manage')", current.id());

    // When
    mvc.perform(get("/accounts/me").with(principal(SUBJECT)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.permissions.manageMaintenance").value(true));
    mvc.perform(
            put("/administration/maintenance/activation")
                .with(principal(SUBJECT))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":0,\"active\":false}"))
        .andExpect(status().isOk());
    sql.update("DELETE FROM account_permission WHERE account_id=?", current.id());

    // Then
    assertThat(accounts.current(ISSUER, SUBJECT).permissions())
        .doesNotContain(Permission.MANAGE_MAINTENANCE);
    mvc.perform(get("/accounts/me").with(principal(SUBJECT)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.permissions.manageMaintenance").value(false));
    mvc.perform(
            put("/administration/maintenance/activation")
                .with(principal(SUBJECT))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":0,\"active\":false}"))
        .andExpect(status().isForbidden());
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Uses the actual surviving or new principal after business erasure")
  void recreatesAfterBusinessErasure(boolean principalSurvives) {
    // Given
    when(provider.read(ISSUER, SUBJECT))
        .thenReturn(new PrincipalReader.Evidence("owner@example.invalid", CREATED, LINKED));
    Account original = establishment.establish(ISSUER, SUBJECT).view().account();
    sql.update("UPDATE account SET username='Former_profile' WHERE id=?", original.id());
    sql.update("INSERT INTO account_permission VALUES (?,'maintenance.manage')", original.id());
    String currentSubject = principalSurvives ? SUBJECT : "apple|new-principal";
    Instant currentCreated = principalSurvives ? CREATED : Instant.parse("2026-10-31T12:00:00Z");
    if (!principalSurvives)
      when(provider.read(ISSUER, currentSubject))
          .thenReturn(
              new PrincipalReader.Evidence("owner@example.invalid", currentCreated, List.of()));
    when(auth0Cleanup.remove(ISSUER, SUBJECT))
        .thenReturn(
            principalSurvives
                ? AccountCleanup.Outcome.UNAVAILABLE_OR_UNCERTAIN
                : AccountCleanup.Outcome.REMOVED);
    when(revenueCatCleanup.remove(original.id().toString()))
        .thenReturn(AccountCleanup.Outcome.UNAVAILABLE_OR_UNCERTAIN);

    // When
    erasure.erase(ISSUER, SUBJECT, original.id());
    EstablishAccount.Outcome replacement = establishment.establish(ISSUER, currentSubject);

    // Then
    assertThat(replacement.created()).isTrue();
    assertThat(replacement.view().account().id()).isNotEqualTo(original.id());
    assertThat(replacement.view().account().principalCreatedAt()).isEqualTo(currentCreated);
    assertThat(replacement.view().account().username()).isNotEqualTo("Former_profile");
    assertThat(replacement.view().permissions()).isEmpty();
    assertThatThrownBy(() -> accounts.original(ISSUER, SUBJECT, original.id()))
        .isInstanceOf(AccountNotFoundException.class);
    assertThatThrownBy(() -> erasure.erase(ISSUER, SUBJECT, original.id()))
        .isInstanceOf(AccountNotFoundException.class);
    assertThat(accounts.current(ISSUER, currentSubject)).isEqualTo(replacement.view());
    verify(auth0Cleanup).remove(ISSUER, SUBJECT);
    verify(revenueCatCleanup).remove(original.id().toString());
  }

  /**
   * Supplies a validated test principal with stale roles that cannot replace current SQL grants.
   *
   * @param subject retained Auth0 principal, shared by linked methods only
   * @return test JWT authentication; real hosted authentication remains a provider qualification
   */
  private static RequestPostProcessor principal(String subject) {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer(ISSUER)
                    .subject(subject)
                    .claim("azp", "mobile-test")
                    .claim("roles", List.of("administrator"))
                    .claim("permissions", List.of("maintenance.manage")));
  }
}
