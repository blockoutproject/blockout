package com.blockout.backend.collection.api;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectionResultService;
import com.blockout.backend.collection.application.service.CollectionSourceService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.collection.application.service.SourcePreparationService;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.assertj.core.api.Assertions;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Exercises producer serialization and request refusal through real generated MVC contracts. */
@WebMvcTest(CollectorOperationsController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  CollectionApiMapperImpl.class,
  CollectionExceptionHandler.class
})
@DisplayName("Generated collector operations HTTP contract")
class CollectionContractWebMvcTest {
  @Autowired private MockMvc mvc;

  @MockitoBean private CollectionSourceService sources;

  @MockitoBean private CollectorRuntimeService runtimes;
  @MockitoBean private SourcePreparationService preparation;

  @Test
  @DisplayName("The generated discovery operation resolves owner identities with no-store")
  void acceptsSourceProposal() throws Exception {
    // Given
    UUID incarnation = UUID.fromString("00000000-0000-4000-8000-000000000171");
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000000172");
    UUID source = UUID.fromString("00000000-0000-4000-8000-000000000173");
    when(sources.observe(ArgumentMatchers.any()))
        .thenReturn(new CollectionSourceService.Resolved(season, source));

    // When
    ResultActions response =
        mvc.perform(
            MockMvcRequestBuilders.post("/ingestion/season-source-observations")
                .with(collector())
                .contentType("application/json")
                .content(
                    """
            {"incarnationId":"%s","startYear":2026,"provider":"ffvb","organizerReference":"ABCCS",
            "candidateUrl":"https://www.ffvbbeach.org/ffvbapp/resu/current.htm",
            "evidenceUrl":"https://www.ffvb.org/119-37-1-Championnats-Nationaux","observedAt":"2026-10-20T09:00:00Z"}
            """
                        .formatted(incarnation)));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.seasonId").value(season.toString()))
        .andExpect(jsonPath("$.sourceBindingId").value(source.toString()));
    ArgumentCaptor<CollectionSourceService.Proposal> command =
        ArgumentCaptor.forClass(CollectionSourceService.Proposal.class);
    Mockito.verify(sources).observe(command.capture());
    Assertions.assertThat(command.getValue().incarnationId()).isEqualTo(incarnation);
    Assertions.assertThat(command.getValue().observedAt())
        .isEqualTo(Instant.parse("2026-10-20T09:00:00Z"));
  }

  @Test
  @DisplayName(
      "The generated validation route maps terminal evidence and acknowledges the source revision")
  void acceptsSourceValidation() throws Exception {
    // Given
    UUID sourceId = UUID.fromString("00000000-0000-4000-8000-000000000166");
    UUID cycleId = UUID.fromString("00000000-0000-4000-8000-000000000167");
    Instant observedAt = Instant.parse("2026-10-20T09:00:00Z");
    CollectionState.SourceValidation result =
        new CollectionState.SourceValidation(
            cycleId, SourceValidationStateEnum.QUALIFIED, observedAt, "2026/2027", null);
    when(preparation.submitValidation(sourceId, result))
        .thenReturn(
            CollectionState.Source.builder()
                .id(sourceId)
                .provider(CollectionProviderEnum.FFVB)
                .organizerReference("ABCCS")
                .revision(3)
                .validationState(SourceValidationStateEnum.QUALIFIED)
                .build());

    // When
    ResultActions response =
        mvc.perform(
            put("/ingestion/source-bindings/{id}/validation", sourceId)
                .with(collector())
                .contentType("application/json")
                .content(
                    """
        {"cycleId":"%s","state":"qualified","observedAt":"2026-10-20T09:00:00Z","seasonEvidence":"2026/2027"}
        """
                        .formatted(cycleId)));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sourceBindingId").value(sourceId.toString()))
        .andExpect(jsonPath("$.revision").value(3))
        .andExpect(jsonPath("$.state").value("qualified"))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @MockitoBean private CollectionCycleService cycles;
  @MockitoBean private CollectionResultService results;

  @Test
  @DisplayName("Returns required explicit null before registration with no-store")
  void returnsUnregisteredRuntime() throws Exception {
    // Given
    when(runtimes.current()).thenReturn(new CollectionState.Runtime(0, null));

    // When
    ResultActions response = mvc.perform(get("/ingestion/collector-runtime").with(collector()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.revision").value(0))
        .andExpect(jsonPath("$.incarnationId").value(Matchers.nullValue()));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":0,\"incarnationId\":null}",
        "{\"revision\":0}",
        "{\"revision\":9007199254740992,\"incarnationId\":\"00000000-0000-4000-8000-000000000001\"}",
        "{\"revision\":0,\"incarnationId\":\"00000000-0000-4000-8000-000000000001\",\"extra\":true}"
      })
  @DisplayName("Rejects malformed or unsafe registration before application effects")
  void rejectsInvalidRegistration(String body) throws Exception {

    // When
    ResultActions response =
        mvc.perform(
            put("/ingestion/collector-runtime")
                .with(collector())
                .contentType("application/json")
                .content(body));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(runtimes, cycles);
  }

  @Test
  @DisplayName("Refuses a mobile identity even when it claims the ingestion scope")
  void refusesMobileIdentity() throws Exception {
    // Given
    RequestPostProcessor mobile =
        jwt()
            .jwt(token -> token.claim("azp", "mobile-test"))
            .authorities(new SimpleGrantedAuthority("SCOPE_sporting:ingest"));

    // When
    ResultActions response = mvc.perform(get("/ingestion/collector-runtime").with(mobile));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(runtimes, cycles);
  }

  @Test
  @DisplayName("A created control cycle exposes its location and omits candidate-only fields")
  void returnsAdmittedControl() throws Exception {
    // Given
    UUID cycle = UUID.fromString("00000000-0000-4000-8000-000000000001");
    UUID startup = UUID.fromString("00000000-0000-4000-8000-000000000002");
    UUID control = UUID.fromString("00000000-0000-4000-8000-000000000003");
    CollectionState.StartCycle command =
        new CollectionState.StartCycle(cycle, startup, control, null, 0, null);
    when(cycles.admit(command))
        .thenReturn(
            new CollectionState.Admission(
                new CollectionState.Cycle(
                    cycle,
                    startup,
                    control,
                    null,
                    1,
                    CollectionModeEnum.PERIODIC,
                    CollectionCycleStateEnum.RUNNING,
                    Instant.parse("2026-10-19T10:00:00Z"),
                    null,
                    0,
                    null,
                    null),
                true));

    // When
    ResultActions response =
        mvc.perform(
            MockMvcRequestBuilders.post("/ingestion/collection-cycles")
                .with(collector())
                .contentType("application/json")
                .content(
                    """
            {"cycleId":"%s","incarnationId":"%s","controlId":"%s","revision":0}
            """
                        .formatted(cycle, startup, control)));

    // Then
    response
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", "/ingestion/collection-cycles/" + cycle))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.mode").value("periodic"))
        .andExpect(jsonPath("$.candidate").doesNotExist())
        .andExpect(jsonPath("$.sourceBindingId").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Serializes target items, page index and continuation for the collector")
  void returnsTargetPage(boolean hasNext) throws Exception {
    // Given
    UUID cycle = UUID.fromString("00000000-0000-4000-8000-000000000001");
    UUID source = UUID.fromString("00000000-0000-4000-8000-000000000002");
    CollectionState.Target target =
        CollectionState.Target.builder()
            .scopeId(source)
            .kind(CollectionTargetKindEnum.DISCOVERY)
            .sourceBindingId(source)
            .url("https://www.ffvb.org/catalog")
            .seasonLabel("2026/2027")
            .provider(CollectionProviderEnum.FFVB)
            .organizerReference("ABCCS")
            .build();
    when(cycles.targets(cycle, 2L, 1))
        .thenReturn(
            new CollectionState.TargetPage(
                List.of(new CollectionState.ServedTarget(target, null, null, null)), 2, hasNext));

    // When
    ResultActions response =
        mvc.perform(
            get("/ingestion/collection-cycles/{id}/targets", cycle)
                .with(collector())
                .param("page", "2")
                .param("size", "1"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.items[0].scopeId").value(source.toString()))
        .andExpect(jsonPath("$.items[0].kind").value("discovery"))
        .andExpect(jsonPath("$.items[0].url").value("https://www.ffvb.org/catalog"))
        .andExpect(jsonPath("$.page").value(2))
        .andExpect(jsonPath("$.hasNext").value(hasNext));
  }

  @ParameterizedTest
  @CsvSource({"size, 0", "size, 201", "page, -1", "page, 9007199254740992"})
  @DisplayName("Rejects out-of-range target pages before loading a snapshot")
  void rejectsUnboundedPage(String parameter, String value) throws Exception {

    // When
    ResultActions response =
        mvc.perform(
            get("/ingestion/collection-cycles/00000000-0000-4000-8000-000000000001/targets")
                .with(collector())
                .param(parameter, value));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(cycles);
  }

  @Test
  @DisplayName("A stale registration returns the shared non-cacheable conflict")
  void returnsConflict() throws Exception {
    // Given
    UUID startup = UUID.fromString("00000000-0000-4000-8000-000000000002");
    when(runtimes.register(0, startup))
        .thenThrow(new CollectionConflictException("stale-revision"));

    // When
    ResultActions response =
        mvc.perform(
            put("/ingestion/collector-runtime")
                .with(collector())
                .contentType("application/json")
                .content(
                    """
            {"revision":0,"incarnationId":"%s"}
            """
                        .formatted(startup)));

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:stale-revision"))
        .andExpect(jsonPath("$.status").value(409));
  }

  /** Supplies only the synthetic service identity accepted by the test's native security chain. */
  private RequestPostProcessor collector() {
    return jwt()
        .jwt(token -> token.claim("azp", "collector-test"))
        .authorities(new SimpleGrantedAuthority("SCOPE_sporting:ingest"));
  }
}
