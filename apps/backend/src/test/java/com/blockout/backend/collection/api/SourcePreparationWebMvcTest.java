package com.blockout.backend.collection.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
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
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.service.PrepareCollectionSources;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.generated.mobile.model.CollectionResourceKindEnum;
import com.blockout.backend.shared.http.IngestionBodyLimitAdvice;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionResource;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionResourcePage;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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

  @Test
  @DisplayName("Source reads retain required nulls and expose no classification readiness")
  void readsSourceEvidence() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.source(ACCOUNT, SOURCE))
        .thenReturn(source(SourceValidationStateEnum.UNVALIDATED));

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
        .andExpect(jsonPath("$.classification").doesNotExist());
  }

  @Test
  @DisplayName("Returns ordered canonical seasons with their preparation revisions")
  void readsSeasons() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.seasons(ACCOUNT))
        .thenReturn(
            List.of(
                new CollectionSeasonView(
                    SEASON, "2026/2027", 2026, CollectionSeasonStateEnum.PREPARING, 3)));

    // When
    ResultActions response = mvc.perform(get("/administration/collection-seasons").with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].startYear").value(2026))
        .andExpect(jsonPath("$.items[0].revision").value(3))
        .andExpect(jsonPath("$.items[0].state").value("preparing"));
  }

  @Test
  @DisplayName("Creating a candidate returns its location without implying qualification")
  void createsUnqualifiedCandidate() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(preparation.create(
            ACCOUNT, SEASON, 3, CollectionProviderEnum.FFVB, "ABCCS", URI.create(URL)))
        .thenReturn(source(SourceValidationStateEnum.UNVALIDATED));

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/collection-seasons/{id}/source-bindings", SEASON)
                .with(mobile())
                .contentType("application/json")
                .content(
                    """
        {"seasonRevision":3,"provider":"ffvb","organizerReference":"ABCCS","candidateUrl":"%s"}
        """
                        .formatted(URL)));

    // Then
    response
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", "/administration/source-bindings/" + SOURCE))
        .andExpect(jsonPath("$.validation").value("unvalidated"));
  }

  @Test
  @DisplayName("Validation accepts pending intent with 202 rather than claiming qualification")
  void acceptsPendingValidation() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(preparation.requestValidation(ACCOUNT, SOURCE, 0))
        .thenReturn(source(SourceValidationStateEnum.PENDING));

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/source-bindings/{id}/validations", SOURCE)
                .with(mobile())
                .contentType("application/json")
                .content("{\"revision\":0}"));

    // Then
    response
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.validation").value("pending"))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Candidate replacement forwards the whole URL and current editing revision")
  void replacesCandidate() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(preparation.setCandidate(ACCOUNT, SOURCE, 2, URI.create(URL)))
        .thenReturn(source(SourceValidationStateEnum.UNVALIDATED));

    // When
    ResultActions response =
        mvc.perform(
            put("/administration/source-bindings/{id}/candidate", SOURCE)
                .with(mobile())
                .contentType("application/json")
                .content("{\"revision\":2,\"candidateUrl\":\"" + URL + "\"}"));

    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.validation").value("unvalidated"));
    verify(preparation).setCandidate(ACCOUNT, SOURCE, 2, URI.create(URL));
  }

  @Test
  @DisplayName("Duplicate binding creation returns the existing canonical conflict")
  void refusesDuplicateBinding() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(preparation.create(
            ACCOUNT, SEASON, 3, CollectionProviderEnum.FFVB, "ABCCS", URI.create(URL)))
        .thenThrow(new CollectionConflictException("conflict"));

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/collection-seasons/{id}/source-bindings", SEASON)
                .with(mobile())
                .contentType("application/json")
                .content(
                    """
        {"seasonRevision":3,"provider":"ffvb","organizerReference":"ABCCS","candidateUrl":"%s"}
        """
                        .formatted(URL)));

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:conflict"));
  }

  @Test
  @DisplayName("Discovered children use default pagination without totals or mapping metadata")
  void readsDirectChildren() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.children(ACCOUNT, SOURCE, null, 0, 50))
        .thenReturn(
            new CollectionResourcePage(
                List.of(
                    new CollectionResource(
                        SEASON, "National", CollectionResourceKindEnum.PACK, null)),
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
        .andExpect(jsonPath("$.items[0].classification").doesNotExist())
        .andExpect(jsonPath("$.total").doesNotExist())
        .andExpect(jsonPath("$.hasNext").value(false));
  }

  @Test
  @DisplayName("Season confirmation preserves the exact submitted label")
  void preservesExactConfirmation() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(preparation.confirmSeason(ACCOUNT, SOURCE, 2, " 2026/2027"))
        .thenThrow(new CollectionConflictException("conflict"));

    // When
    ResultActions response =
        mvc.perform(
            put("/administration/source-bindings/{id}/season-confirmation", SOURCE)
                .with(mobile())
                .contentType("application/json")
                .content("{\"revision\":2,\"seasonLabel\":\" 2026/2027\"}"));

    // Then
    response.andExpect(status().isConflict());
    verify(preparation).confirmSeason(ACCOUNT, SOURCE, 2, " 2026/2027");
  }

  @Test
  @DisplayName("A selected launch is forwarded as one atomic command")
  void forwardsCompleteSelection() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(preparation.launch(ACCOUNT, SEASON, 3, Set.of(SOURCE)))
        .thenReturn(
            new CollectionSeasonView(
                SEASON, "2026/2027", 2026, CollectionSeasonStateEnum.ACTIVE, 4));

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/collection-seasons/{id}/source-launches", SEASON)
                .with(mobile())
                .contentType("application/json")
                .content("{\"revision\":3,\"sourceBindingIds\":[\"" + SOURCE + "\"]}"));

    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.state").value("active"));
    verify(preparation).launch(ACCOUNT, SEASON, 3, Set.of(SOURCE));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"revision\":null}",
        "{\"revision\":-1}",
        "{\"revision\":9007199254740992}"
      })
  @DisplayName("Missing or invalid body revisions fail before any application command")
  void refusesInvalidRevision(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/administration/source-bindings/{id}/validations", SOURCE)
            .with(mobile())
            .contentType("application/json")
            .content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(preparation);
  }

  @Test
  @DisplayName("An oversized selection is refused without dispatching chunks")
  void refusesOversizedCommand() throws Exception {
    // Given
    String body = " ".repeat(8 * 1024 * 1024 + 1);

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/collection-seasons/{id}/source-launches", SEASON)
                .with(mobile())
                .contentType("application/json")
                .content(body));

    // Then
    response.andExpect(status().isContentTooLarge());
    verifyNoInteractions(preparation);
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
    when(configurationReads.source(ACCOUNT, SOURCE))
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
