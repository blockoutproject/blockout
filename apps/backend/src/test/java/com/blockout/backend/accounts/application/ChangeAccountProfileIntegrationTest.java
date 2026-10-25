package com.blockout.backend.accounts.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.InvalidProfileChangeException;
import com.blockout.backend.accounts.application.exception.UsernameUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.accounts.infrastructure.ProfilePhotoProcessor;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockPart;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real PostgreSQL locks/constraints and transaction commits, with synthetic identity/provider data.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Atomic original-account profile transactions")
class ChangeAccountProfileIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final String ISSUER = "https://identity.example.invalid/";
  // Storage fixtures exercise transaction semantics; ImageIO content has its own processor suite.
  private static final ProfilePhoto PHOTO = new ProfilePhoto(new byte[] {1, 2, 3}, "image/png", 1);
  @Autowired private ChangeAccountProfile changes;
  @Autowired private AccountStore accounts;
  @Autowired private ReadAccount reads;
  @Autowired private EstablishAccount establishment;
  @MockitoBean private PrincipalReader provider;
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private MockMvc mvc;
  @MockitoBean private MaintenanceAdmission admission;
  @MockitoSpyBean private ProfilePhotoProcessor photos;
  private TransactionTemplate transaction;
  private UUID id;

  /**
   * Applies the actual disposable baseline before validation-only startup.
   *
   * @param properties application settings bound to this suite's private container
   * @throws Exception if the real migration cannot initialize the disposable database
   */
  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Creates the scenario's original lifecycle through its real persistence port. */
  @BeforeEach
  void prepare() {
    sql.update("DELETE FROM account");
    transaction = new TransactionTemplate(transactions);
    id =
        transaction.execute(
            status ->
                accounts.create(ISSUER, "auth0|one", "Original", "one@example.invalid", null).id());
  }

  @Test
  @DisplayName("Saves normalized username and photo together and preserves them on provider login")
  void savesProfileAtomically() {
    // Given
    when(provider.read(ISSUER, "auth0|one"))
        .thenReturn(
            new PrincipalReader.Evidence(
                "updated@example.invalid", Instant.parse("2020-01-01T00:00:00Z"), List.of()));

    // When
    ReadAccount.View saved =
        changes.change(
            ISSUER, "auth0|one", id, "  Chosen_name  ", ProfilePhotoActionEnum.REPLACE, PHOTO);
    Account loggedIn = establishment.establish(ISSUER, "auth0|one").view().account();

    // Then
    assertThat(saved.account().username()).isEqualTo("Chosen_name");
    assertThat(saved.hasPhoto()).isTrue();
    assertThat(loggedIn.username()).isEqualTo("Chosen_name");
    assertThat(sql.queryForObject("SELECT photo_bytes FROM account WHERE id = ?", byte[].class, id))
        .isEqualTo(PHOTO.bytes());
  }

  @Test
  @DisplayName("Rolls back replacement when a case-insensitive username is unavailable")
  void refusesCollisionAtomically() {
    // Given
    transaction.executeWithoutResult(
        status -> accounts.create(ISSUER, "auth0|other", "TAKEN", "other@example.invalid", null));
    changes.change(ISSUER, "auth0|one", id, null, ProfilePhotoActionEnum.REPLACE, PHOTO);
    ProfilePhoto replacement = new ProfilePhoto(new byte[] {4, 5}, "image/jpeg", 2);

    // When
    ThrowingCallable change =
        () ->
            changes.change(
                ISSUER, "auth0|one", id, "taken", ProfilePhotoActionEnum.REPLACE, replacement);

    // Then
    assertThatThrownBy(change).isInstanceOf(UsernameUnavailableException.class);
    assertThat(accounts.findById(id).orElseThrow().username()).isEqualTo("Original");
    assertThat(sql.queryForObject("SELECT photo_bytes FROM account WHERE id = ?", byte[].class, id))
        .isEqualTo(PHOTO.bytes());
  }

  @Test
  @DisplayName("Refuses an invalid username without removing the previous photo")
  void refusesInvalidFieldAtomically() {
    // Given
    changes.change(ISSUER, "auth0|one", id, null, ProfilePhotoActionEnum.REPLACE, PHOTO);

    // When
    ThrowingCallable change =
        () -> changes.change(ISSUER, "auth0|one", id, "ab", ProfilePhotoActionEnum.REMOVE, null);

    // Then
    assertThatThrownBy(change).isInstanceOf(InvalidProfileChangeException.class);
    assertThat(reads.original(ISSUER, "auth0|one", id).hasPhoto()).isTrue();
  }

  @Test
  @DisplayName("Removes all photo columns only on explicit removal")
  void removesPhotoExplicitly() {
    // Given
    changes.change(ISSUER, "auth0|one", id, null, ProfilePhotoActionEnum.REPLACE, PHOTO);

    // When
    changes.change(ISSUER, "auth0|one", id, "Original", ProfilePhotoActionEnum.REMOVE, null);

    // Then
    assertThat(
            sql.queryForMap(
                    "SELECT photo_bytes, photo_media_type, photo_dimension FROM account WHERE id = ?",
                    id)
                .values())
        .containsOnlyNulls();
    assertThat(reads.original(ISSUER, "auth0|one", id).hasPhoto()).isFalse();
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Serializes concurrent supplied fields while preserving omitted fields")
  void preservesOmittedConcurrentFields(boolean sameField) throws Exception {
    // Given
    CompletableFuture<Integer> secondPid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<ReadAccount.View> result =
          transaction.execute(
              status -> {
                accounts.lockById(id).orElseThrow();
                Future<ReadAccount.View> second =
                    worker.submit(
                        () ->
                            transaction.execute(
                                inner -> {
                                  secondPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return changes.change(
                                      ISSUER,
                                      "auth0|one",
                                      id,
                                      sameField ? "Last_name" : null,
                                      ProfilePhotoActionEnum.REPLACE,
                                      PHOTO);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, secondPid);
                changes.change(ISSUER, "auth0|one", id, "First_name", null, null);
                // Observe the contender only after the first transaction commits.
                return second;
              });

      // When
      ReadAccount.View accepted = result.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(accepted.account().username()).isEqualTo(sameField ? "Last_name" : "First_name");
      assertThat(accepted.hasPhoto()).isTrue();
    }
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("An old UUID write cannot modify a replacement after deletion wins the row lock")
  void refusesDeletedOriginal(boolean recreate) throws Exception {
    // Given
    CompletableFuture<Integer> writerPid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<ReadAccount.View> result =
          transaction.execute(
              status -> {
                accounts.lockById(id).orElseThrow();
                Future<ReadAccount.View> writing =
                    worker.submit(
                        () ->
                            transaction.execute(
                                inner -> {
                                  writerPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return changes.change(
                                      ISSUER,
                                      "auth0|one",
                                      id,
                                      "Late_name",
                                      ProfilePhotoActionEnum.REPLACE,
                                      PHOTO);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, writerPid);
                sql.update("DELETE FROM account WHERE id = ?", id);
                return writing;
              });
      if (recreate)
        transaction.executeWithoutResult(
            status ->
                accounts.create(ISSUER, "auth0|one", "Replacement", "new@example.invalid", null));

      // When
      ThrowingCallable completed = () -> result.get(15, TimeUnit.SECONDS);

      // Then
      assertThatThrownBy(completed).hasCauseInstanceOf(AccountNotFoundException.class);
      assertThat(accounts.findById(id)).isEmpty();
      if (recreate)
        assertThat(accounts.findByPrincipal(ISSUER, "auth0|one").orElseThrow().username())
            .isEqualTo("Replacement");
    }
  }

  @Test
  @DisplayName("Validates and reencodes actual image bytes before entering the profile transaction")
  void preparesPhotoOutsideSql() throws Exception {
    // Given
    ByteArrayOutputStream encoded = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB), "png", encoded);
    MockPart metadata =
        new MockPart(
            "metadata",
            "{\"username\":\"Prepared\",\"photoAction\":\"replace\"}"
                .getBytes(java.nio.charset.StandardCharsets.UTF_8));
    metadata.getHeaders().setContentType(MediaType.APPLICATION_JSON);
    MockPart image = new MockPart("image", "photo.png", encoded.toByteArray());
    image.getHeaders().setContentType(MediaType.IMAGE_PNG);
    doAnswer(
            call -> {
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              return call.callRealMethod();
            })
        .when(photos)
        .prepare(any(), any());

    // When
    mvc.perform(
            multipart(HttpMethod.PATCH, "/accounts/" + id)
                .part(metadata, image)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject("auth0|one")
                                    .claim("azp", "mobile-test"))
                        .authorities(new SimpleGrantedAuthority("SCOPE_openid"))))
        .andExpect(status().isOk());

    // Then
    assertThat(reads.original(ISSUER, "auth0|one", id).account().username()).isEqualTo("Prepared");
    assertThat(reads.photo(ISSUER, "auth0|one", id).dimension()).isEqualTo(8);
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Serializes replacement and removal of the same original photo")
  void serializesPhotoChanges(boolean replaceLast) throws Exception {
    // Given
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<ReadAccount.View> result =
          transaction.execute(
              status -> {
                accounts.lockById(id).orElseThrow();
                Future<ReadAccount.View> second =
                    worker.submit(
                        () ->
                            transaction.execute(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return changes.change(
                                      ISSUER,
                                      "auth0|one",
                                      id,
                                      null,
                                      replaceLast
                                          ? ProfilePhotoActionEnum.REPLACE
                                          : ProfilePhotoActionEnum.REMOVE,
                                      replaceLast ? PHOTO : null);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                changes.change(
                    ISSUER,
                    "auth0|one",
                    id,
                    null,
                    replaceLast ? ProfilePhotoActionEnum.REMOVE : ProfilePhotoActionEnum.REPLACE,
                    replaceLast ? null : PHOTO);
                return second;
              });

      // When
      ReadAccount.View accepted = result.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(accepted.hasPhoto()).isEqualTo(replaceLast);
      assertThat(accounts.photo(id).isPresent()).isEqualTo(replaceLast);
      assertThat(accepted.account().username()).isEqualTo("Original");
    }
  }

  @Test
  @DisplayName("Allows at most one competing account to acquire a username regardless of case")
  void settlesConcurrentUsernameCollision() throws Exception {
    // Given
    UUID other =
        transaction.execute(
            status ->
                accounts
                    .create(ISSUER, "auth0|other", "Other", "other@example.invalid", null)
                    .id());
    CyclicBarrier start = new CyclicBarrier(2);
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      List<Future<ReadAccount.View>> results =
          List.of(
              workers.submit(
                  () -> {
                    start.await(10, TimeUnit.SECONDS);
                    return changes.change(
                        ISSUER, "auth0|one", id, "Shared", ProfilePhotoActionEnum.REPLACE, PHOTO);
                  }),
              workers.submit(
                  () -> {
                    start.await(10, TimeUnit.SECONDS);
                    return changes.change(
                        ISSUER,
                        "auth0|other",
                        other,
                        "SHARED",
                        ProfilePhotoActionEnum.REPLACE,
                        PHOTO);
                  }));

      // When
      int winners = 0;
      for (Future<ReadAccount.View> result : results) {
        try {
          result.get(15, TimeUnit.SECONDS);
          winners++;
        } catch (ExecutionException refusal) {
          assertThat(refusal.getCause()).isInstanceOf(UsernameUnavailableException.class);
        }
      }

      // Then
      assertThat(winners).isEqualTo(1);
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM account WHERE LOWER(username) = 'shared' AND photo_bytes IS NOT NULL",
                  Long.class))
          .isEqualTo(1L);
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM account WHERE LOWER(username) <> 'shared' AND photo_bytes IS NULL",
                  Long.class))
          .isEqualTo(1L);
    }
  }
}
