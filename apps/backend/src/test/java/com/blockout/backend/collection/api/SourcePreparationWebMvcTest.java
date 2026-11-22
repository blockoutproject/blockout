package com.blockout.backend.collection.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionState.CatalogRead;
import com.blockout.backend.collection.application.model.CollectionState.CatalogStatus;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.SourceCatalog;
import com.blockout.backend.collection.application.service.PrepareCollectionSources;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.generated.mobile.model.CollectionResourceKindEnum;
import com.blockout.backend.shared.http.IngestionBodyLimitAdvice;
import com.blockout.backend.shared.pagination.OffsetPage;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionResource;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Generated HTTP validation and real response mapping; application transactions have PostgreSQL
 * tests.
 */
@WebMvcTest(CollectionSourcesController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  CurrentAccount.class,
  CollectionApiMapperImpl.class,
  CollectionExceptionHandler.class,
  IngestionBodyLimitAdvice.class
})
@DisplayName("Source preparation HTTP boundary")
@MockitoBean(types = com.blockout.backend.access.application.MaintenanceAdmission.class)
class SourcePreparationWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000166");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000167");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000168");
  private static final String URL =
      "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=ABCCS";
  @Autowired private MockMvc mvc;
  @MockitoBean private PrepareCollectionSources preparation;
  @MockitoBean private ReadCollectionConfiguration configurationReads;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private CurrentPermissions permissions;

  @Test
  @DisplayName("Source reads retain required nulls and expose no classification readiness")
  void readsSourceEvidence() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.sourceCatalog(ACCOUNT, SOURCE))
        .thenReturn(
            new SourceCatalog(
                source(SourceValidationStateEnum.UNVALIDATED),
                new CatalogRead(CatalogStatus.NOT_READ, null, null, null)));

    // When
    ResultActions response =
        mvc.perform(get("/administration/source-bindings/{id}", SOURCE).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.candidateUrl").value(URL))
        .andExpect(jsonPath("$.acceptedUrl").value(Matchers.nullValue()))
        .andExpect(jsonPath("$.validatedAt").value(Matchers.nullValue()))
        .andExpect(jsonPath("$.seasonEvidence").value(Matchers.nullValue()))
        .andExpect(jsonPath("$.reason").value(Matchers.nullValue()))
        .andExpect(jsonPath("$.validation").value("unvalidated"))
        .andExpect(jsonPath("$.catalog.status").value("not-read"))
        .andExpect(jsonPath("$.catalog.observedAt").doesNotExist())
        .andExpect(jsonPath("$.catalog.lastCompleteAt").doesNotExist())
        .andExpect(jsonPath("$.classification").doesNotExist());
  }

  @Test
  @DisplayName("Returns ordered canonical seasons with their current lifecycle")
  void readsSeasons() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.seasons(ACCOUNT))
        .thenReturn(
            List.of(
                new CollectionSeasonView(
                    SEASON, "2026/2027", 2026, CollectionSeasonStateEnum.PREPARING)));

    // When
    ResultActions response = mvc.perform(get("/administration/collection-seasons").with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].startYear").value(2026))
        .andExpect(jsonPath("$.items[0].state").value("preparing"));
  }

  @Test
  @DisplayName("The latest unavailable read keeps the official URL and last complete read visible")
  void exposesUnavailableCatalogueWithRetainedEvidence() throws Exception {
    // Given
    Instant lastAttempt = Instant.parse("2026-10-17T12:00:00Z");
    CollectionResult failedRead =
        new CollectionResult(
            SOURCE,
            CollectionStageEnum.DISCOVERY,
            CollectionPhaseEnum.ACQUISITION,
            2,
            1,
            lastAttempt,
            CollectionOutcomeEnum.FAILED,
            null,
            null,
            "The source responded with HTTP 503.",
            null,
            null);
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.sourceCatalog(ACCOUNT, SOURCE))
        .thenReturn(
            new SourceCatalog(
                source(SourceValidationStateEnum.QUALIFIED).toBuilder()
                    .acceptedUrl(URL)
                    .locked(true)
                    .build(),
                new CatalogRead(
                    CatalogStatus.UNAVAILABLE,
                    lastAttempt,
                    Instant.parse("2026-10-16T11:48:00Z"),
                    failedRead)));

    // When
    ResultActions response =
        mvc.perform(get("/administration/source-bindings/{id}", SOURCE).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.acceptedUrl").value(URL))
        .andExpect(jsonPath("$.catalog.status").value("unavailable"))
        .andExpect(jsonPath("$.catalog.observedAt").value("2026-10-17T12:00:00Z"))
        .andExpect(jsonPath("$.catalog.lastCompleteAt").value("2026-10-16T11:48:00Z"))
        .andExpect(jsonPath("$.catalog.reason").value("The source responded with HTTP 503."));
  }

  @Test
  @DisplayName("Discovered children use default pagination without totals or mapping metadata")
  void readsDirectChildren() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.children(ACCOUNT, SOURCE, null, 0, 50))
        .thenReturn(
            new OffsetPage<>(
                List.of(
                    new CollectionResource(
                        SEASON, "National", CollectionResourceKindEnum.PACK, null, null, 2)),
                0,
                false));

    // When
    ResultActions response =
        mvc.perform(get("/administration/source-bindings/{id}/children", SOURCE).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].kind").value("pack"))
        .andExpect(jsonPath("$.items[0].parentId").doesNotExist())
        .andExpect(jsonPath("$.items[0].poolCount").value(2))
        .andExpect(jsonPath("$.items[0].classification").doesNotExist())
        .andExpect(jsonPath("$.total").doesNotExist())
        .andExpect(jsonPath("$.hasNext").value(false));
  }

  @Test
  @DisplayName("Activation targets only the season and returns its new lifecycle")
  void activatesSeason() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(preparation.activate(ACCOUNT, SEASON))
        .thenReturn(
            new CollectionSeasonView(SEASON, "2026/2027", 2026, CollectionSeasonStateEnum.ACTIVE));

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/collection-seasons/{id}/activation", SEASON).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.id").value(SEASON.toString()))
        .andExpect(jsonPath("$.state").value("active"));
    verify(preparation).activate(ACCOUNT, SEASON);
  }

  @ParameterizedTest
  @ValueSource(strings = {"size=201", "size=0", "page=-1"})
  @DisplayName("Direct child reads enforce generated pagination bounds")
  void boundsChildren(String query) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        get("/administration/source-bindings/" + SOURCE + "/children?" + query).with(mobile());

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(configurationReads);
  }

  @Test
  @DisplayName("A revoked operational grant returns 403 even with an explicit bypass header")
  void requiresOperationalGrant() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.sourceCatalog(ACCOUNT, SOURCE))
        .thenThrow(new AccessDeniedException("Collection management is not permitted"));

    // When
    ResultActions response =
        mvc.perform(
            get("/administration/source-bindings/{id}", SOURCE)
                .with(mobile())
                .header("Blockout-Maintenance-Bypass", "true"));

    // Then
    response
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  /**
   * Creates the shared valid source shape while leaving qualification explicit in each scenario.
   *
   * @param state scenario-owned qualification
   * @return unlaunched candidate with absent optional evidence
   */
  private Source source(SourceValidationStateEnum state) {
    return Source.builder()
        .id(SOURCE)
        .seasonId(SEASON)
        .provider(CollectionProviderEnum.FFVB)
        .organizerReference("ABCCS")
        .candidateUrl(URL)
        .validationState(state)
        .build();
  }

  /**
   * Supplies an authenticated mobile identity without inventing local account permissions.
   *
   * @return native security test identity
   */
  private RequestPostProcessor mobile() {
    return jwt()
        .jwt(
            token -> token.issuer("https://identity.example.invalid/").claim("azp", "mobile-test"));
  }
}
