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
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import java.time.Instant;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

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
  @MockitoBean private CollectorRuntimeService runtimes;
  @MockitoBean private CollectionCycleService cycles;

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
