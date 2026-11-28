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
import com.blockout.backend.collection.application.service.AcceptSourceValidation;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.ObserveCollectionSource;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.collection.application.service.RecordCollectionResults;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import java.net.URI;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
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

  @MockitoBean private ObserveCollectionSource sources;

  @MockitoBean private RecordCollectionResults results;
  @MockitoBean private ReadCollectionConfiguration configurationReads;
  @MockitoBean private AdmitCollectionCycle cycles;
  @MockitoBean private RegisterCollectorRuntime runtimes;
  @MockitoBean private ReadCollectionWork collectionWork;
  @MockitoBean private AcceptSourceValidation sourceValidation;
  @MockitoBean private AccountAccess accounts;

  @ParameterizedTest
  @ValueSource(
      strings = {
        "urn:blockout:acquisition:technical",
        "urn:blockout:acquisition:structure",
        "UncheckedIOException",
        "rejected"
      })
  @DisplayName("Preserves unknown details for callers using the original unfiltered request")
  void preservesResultPresence(String machineReason) throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    Instant time = Instant.parse("2026-10-19T12:00:00Z");
    URI reasonType = URI.create("urn:blockout:acquisition:technical");
    CollectionResult result =
        new CollectionResult(
            ID,
            CollectionStageEnum.CLUB_SHEET,
            CollectionPhaseEnum.INTEGRATION,
            1,
            2,
            time,
            CollectionOutcomeEnum.FAILED,
            null,
            reasonType,
            machineReason,
            null,
            null);
    when(configurationReads.results(
            ACCOUNT, ID, new CollectionState.ResultFilters(null, null, null, null), 0, 50))
        .thenReturn(
            new CollectionState.ResultPage(
                List.of(new CollectionState.ResultRow(result, null, null)),
                0,
                false,
                new CollectionState.ResultSummary(0, 0, 1, 0)));

    // When
    ResultActions response =
        mvc.perform(get("/administration/collection-controls/{id}/results", ID).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.items[0].scopeId").value(ID.toString()))
        .andExpect(jsonPath("$.items[0].scopeLabel").value("Périmètre inconnu"))
        .andExpect(jsonPath("$.items[0].phase").value("integration"))
        .andExpect(jsonPath("$.items[0].source").doesNotExist())
        .andExpect(jsonPath("$.items[0].reasonType").value(reasonType.toString()))
        .andExpect(jsonPath("$.items[0].reason").doesNotExist())
        .andExpect(jsonPath("$.items[0].obtainedCount").doesNotExist())
        .andExpect(jsonPath("$.items[0].rejectedCount").doesNotExist())
        .andExpect(jsonPath("$.items[0].lastSuccessAt").value(Matchers.nullValue()))
        .andExpect(jsonPath("$.summary.failed").value(1));
  }

  @Test
  @DisplayName("Binds search and filters and returns confirmed source and result evidence")
  void returnsFilteredResultEvidence() throws Exception {
    // Given
    UUID sourceId = UUID.fromString("00000000-0000-4000-8000-000000000155");
    UUID packId = UUID.fromString("00000000-0000-4000-8000-000000000156");
    Instant time = Instant.parse("2026-10-19T12:00:00Z");
    CollectionResult result =
        new CollectionResult(
            ID,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            1,
            2,
            time,
            CollectionOutcomeEnum.PARTIAL,
            time,
            null,
            "Two observations were rejected.",
            8L,
            2L);
    CollectionState.ResultSource source =
        new CollectionState.ResultSource(sourceId, "Ligue de Bretagne", packId, ID, null);
    CollectionState.ResultRow row =
        new CollectionState.ResultRow(result, "Nationale 2 féminine - Poule B", source);
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.results(
            ACCOUNT,
            ID,
            new CollectionState.ResultFilters(
                "féminine calendrier",
                CollectionOutcomeEnum.PARTIAL,
                sourceId,
                CollectionStageEnum.CALENDAR),
            1,
            2))
        .thenReturn(
            new CollectionState.ResultPage(
                List.of(row), 1, false, new CollectionState.ResultSummary(10, 3, 1, 0)));

    // When
    ResultActions response =
        mvc.perform(
            get("/administration/collection-controls/{id}/results", ID)
                .queryParam("query", "féminine calendrier")
                .queryParam("status", "partial")
                .queryParam("sourceId", sourceId.toString())
                .queryParam("stage", "calendar")
                .queryParam("page", "1")
                .queryParam("size", "2")
                .with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page").value(1))
        .andExpect(jsonPath("$.items[0].scopeLabel").value("Nationale 2 féminine - Poule B"))
        .andExpect(jsonPath("$.items[0].source.id").value(sourceId.toString()))
        .andExpect(jsonPath("$.items[0].source.label").value("Ligue de Bretagne"))
        .andExpect(jsonPath("$.items[0].source.packId").value(packId.toString()))
        .andExpect(jsonPath("$.items[0].source.poolId").value(ID.toString()))
        .andExpect(jsonPath("$.items[0].source.phaseReference").doesNotExist())
        .andExpect(jsonPath("$.items[0].stage").value("calendar"))
        .andExpect(jsonPath("$.items[0].phase").value("acquisition"))
        .andExpect(jsonPath("$.items[0].outcome").value("partial"))
        .andExpect(jsonPath("$.items[0].observedAt").value(time.toString()))
        .andExpect(jsonPath("$.items[0].reason").value("Two observations were rejected."))
        .andExpect(jsonPath("$.items[0].obtainedCount").value(8))
        .andExpect(jsonPath("$.items[0].rejectedCount").value(2))
        .andExpect(jsonPath("$.summary.success").value(10))
        .andExpect(jsonPath("$.summary.partial").value(3))
        .andExpect(jsonPath("$.summary.failed").value(1))
        .andExpect(jsonPath("$.summary.unconfirmed").value(0));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "size=201",
        "size=0",
        "page=-1",
        "status=unknown",
        "status=PARTIAL",
        "stage=unknown",
        "sourceId=foreign"
      })
  @DisplayName("Rejects invalid pagination and filters before reading results")
  void rejectsInvalidParameters(String query) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        get("/administration/collection-controls/" + ID + "/results?" + query).with(mobile());

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(configurationReads);
  }

  @Test
  @DisplayName("Rejects search beyond the supported Unicode character limit")
  void rejectsLongSearch() throws Exception {
    // Given
    String query = "é".repeat(201);

    // When
    ResultActions response =
        mvc.perform(
            get("/administration/collection-controls/{id}/results", ID)
                .queryParam("query", query)
                .with(mobile()));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(configurationReads);
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
