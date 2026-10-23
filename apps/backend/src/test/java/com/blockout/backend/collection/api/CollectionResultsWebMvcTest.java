package com.blockout.backend.collection.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectionResultService;
import com.blockout.backend.collection.application.service.CollectionSourceService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.collection.application.service.SourcePreparationService;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Exercises generated validation, security and response shape while isolating application results.
 */
@WebMvcTest({CollectionResultsController.class, CollectorOperationsController.class})
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  CurrentAccount.class,
  CollectionApiMapperImpl.class,
  CollectionExceptionHandler.class
})
@DisplayName("Current collection results and terminal HTTP boundary")
@MockitoBean(types = com.blockout.backend.access.application.MaintenanceAdmission.class)
class CollectionResultsWebMvcTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000153");
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000154");
  @Autowired private MockMvc mvc;

  @MockitoBean private CollectionSourceService sources;

  @MockitoBean private CollectionResultService results;
  @MockitoBean private CollectionCycleService cycles;
  @MockitoBean private CollectorRuntimeService runtimes;
  @MockitoBean private SourcePreparationService preparation;
  @MockitoBean private AccountAccess accounts;

  @Test
  @DisplayName("Omits unmeasured counts and retains required nullable recovery timestamps")
  void preservesResultPresence() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    Instant time = Instant.parse("2026-10-19T12:00:00Z");
    CollectionResult result =
        new CollectionResult(
            ID,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.INTEGRATION,
            1,
            2,
            time,
            CollectionOutcomeEnum.UNCONFIRMED,
            null,
            time,
            null,
            null,
            null,
            null);
    when(results.list(ACCOUNT, ID, 0, 50))
        .thenReturn(new CollectionState.ResultPage(List.of(result), 0, false));

    // When
    ResultActions response =
        mvc.perform(get("/administration/collection-controls/{id}/results", ID).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.items[0].phase").value("integration"))
        .andExpect(jsonPath("$.items[0].obtainedCount").doesNotExist())
        .andExpect(jsonPath("$.items[0].rejectedCount").doesNotExist())
        .andExpect(jsonPath("$.items[0].lastSuccessAt").value(Matchers.nullValue()))
        .andExpect(jsonPath("$.items[0].firstFailureAt").value("2026-10-19T12:00:00Z"));
  }

  @ParameterizedTest
  @ValueSource(strings = {"size=201", "size=0", "page=-1"})
  @DisplayName("Rejects pagination outside the generated bounded contract")
  void rejectsInvalidPagination(String query) throws Exception {
    // When
    ResultActions response =
        mvc.perform(
            get("/administration/collection-controls/" + ID + "/results?" + query).with(mobile()));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(results);
  }

  @Test
  @DisplayName("Refuses current results after collection-management permission is withdrawn")
  void refusesRevokedPermission() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(results.list(ACCOUNT, ID, 0, 50))
        .thenThrow(new AccessDeniedException("Collection management is not permitted"));

    // When
    ResultActions response =
        mvc.perform(get("/administration/collection-controls/{id}/results", ID).with(mobile()));

    // Then
    response
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Rejects unsafe result ordinals before application effects")
  void rejectsUnsafeOrder() throws Exception {
    // Given
    String body =
        "{\"scopeId\":\""
            + ID
            + "\",\"stage\":\"calendar\",\"phase\":\"acquisition\",\"readOrdinal\":9007199254740992,\"observedAt\":\"2026-10-19T12:00:00Z\",\"outcome\":\"success\"}";

    // When
    ResultActions response =
        mvc.perform(
            post("/ingestion/collection-cycles/{id}/results", ID)
                .with(collector())
                .contentType("application/json")
                .content(body));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(results);
  }

  @Test
  @DisplayName("Returns the safe canonical conflict for an incompatible terminal write")
  void refusesConflictingCompletion() throws Exception {
    // Given
    when(results.complete(eq(ID), any()))
        .thenThrow(new CollectionConflictException("invalid-cycle-context"));

    // When
    ResultActions response =
        mvc.perform(
            put("/ingestion/collection-cycles/{id}/completion", ID)
                .with(collector())
                .contentType("application/json")
                .content("{\"completedAt\":\"2026-10-19T12:00:00Z\"}"));

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-cycle-context"));
  }

  /**
   * Supplies a validated mobile identity; local grants still belong to the application.
   *
   * @return native validated mobile test identity, without fabricated local permissions
   */
  private RequestPostProcessor mobile() {
    return jwt()
        .jwt(
            token -> token.issuer("https://identity.example.invalid/").claim("azp", "mobile-test"));
  }

  /**
   * Supplies the dedicated collector identity and ingestion scope.
   *
   * @return dedicated collector test identity with its existing M2M scope
   */
  private RequestPostProcessor collector() {
    return jwt()
        .jwt(token -> token.claim("azp", "collector-test"))
        .authorities(new SimpleGrantedAuthority("SCOPE_sporting:ingest"));
  }
}
