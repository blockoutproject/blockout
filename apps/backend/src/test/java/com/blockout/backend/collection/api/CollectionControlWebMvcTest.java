package com.blockout.backend.collection.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.ControlView;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.service.ChangeCollectionControls;
import com.blockout.backend.collection.application.service.ChangeCollectionControls.RequestOutcome;
import com.blockout.backend.collection.application.service.CloseCollectionSeason;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Generated control routes preserve application outcomes and reject malformed command input. */
@WebMvcTest(CollectionControlsController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  CurrentAccount.class,
  CollectionApiMapperImpl.class
})
@MockitoBean(types = com.blockout.backend.access.application.MaintenanceAdmission.class)
@DisplayName("Generated collection control HTTP boundary")
class CollectionControlWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000183");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000184");
  @Autowired private MockMvc mvc;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private ChangeCollectionControls controls;
  @MockitoBean private ReadCollectionConfiguration configurationReads;
  @MockitoBean private CloseCollectionSeason closure;

  @Test
  @DisplayName("A pending collection request returns 202 with its retained intent")
  void acceptsPendingRequest() throws Exception {
    // Given
    UUID pending = UUID.fromString("00000000-0000-4000-8000-000000000185");
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(controls.request(ACCOUNT, CONTROL, 0))
        .thenReturn(new RequestOutcome(controlView(null, pending), false));

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/collection-controls/{id}/requests", CONTROL)
                .with(operator())
                .contentType("application/json")
                .content("{\"revision\":0}"));

    // Then
    response
        .andExpect(status().isAccepted())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.pendingRequestId").value(pending.toString()))
        .andExpect(jsonPath("$.cycle").doesNotExist());
  }

  @Test
  @DisplayName("Already running collection work returns 200 with the admitted cycle")
  void returnsRunningWork() throws Exception {
    // Given
    UUID cycleId = UUID.fromString("00000000-0000-4000-8000-000000000186");
    UUID incarnationId = UUID.fromString("00000000-0000-4000-8000-000000000187");
    Cycle running =
        new Cycle(
            cycleId,
            incarnationId,
            CONTROL,
            null,
            1,
            CollectionModeEnum.MANUAL,
            CollectionCycleStateEnum.RUNNING,
            Instant.parse("2026-10-25T12:00:00Z"),
            null,
            0,
            null,
            null);
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(controls.request(ACCOUNT, CONTROL, 0))
        .thenReturn(new RequestOutcome(controlView(running, null), true));

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/collection-controls/{id}/requests", CONTROL)
                .with(operator())
                .contentType("application/json")
                .content("{\"revision\":0}"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.cycle.id").value(cycleId.toString()))
        .andExpect(jsonPath("$.cycle.state").value("running"));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"enabled\":true}",
        "{\"revision\":0}",
        "{\"revision\":0,\"enabled\":null}",
        "{\"revision\":-1,\"enabled\":true}",
        "{\"revision\":9007199254740992,\"enabled\":true}",
        "{\"revision\":0,\"enabled\":true,\"initialImport\":true}"
      })
  @DisplayName(
      "Activity requires a safe revision and explicit boolean, and rejects unknown properties")
  void validatesActivity(String body) throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(UUID.randomUUID()));

    // When
    ResultActions response =
        mvc.perform(
            put("/administration/collection-controls/{id}/activity", UUID.randomUUID())
                .with(operator())
                .contentType("application/json")
                .content(body));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(controls, closure);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"revision\":0,\"scopeId\":\"00000000-0000-4000-8000-000000000183\"}",
        "{\"revision\":0,\"mode\":\"initial-import\"}"
      })
  @DisplayName("Manual HTTP requests cannot select an individual target or initial-import mode")
  void validatesRequest(String body) throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(UUID.randomUUID()));

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/collection-controls/{id}/requests", UUID.randomUUID())
                .with(operator())
                .contentType("application/json")
                .content(body));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(controls, closure);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":0}",
        "{\"revision\":0,\"confirmation\":\"\"}",
        "{\"revision\":0,\"confirmation\":\"2026/2027\",\"reopen\":true}"
      })
  @DisplayName("Closure requires typed confirmation and offers no reopening flag")
  void validatesClosure(String body) throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(UUID.randomUUID()));

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/collection-seasons/{id}/closure", UUID.randomUUID())
                .with(operator())
                .contentType("application/json")
                .content(body));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(controls, closure);
  }

  /**
   * Constructs a seasonless control with only the scenario's current work or pending intent.
   *
   * @param cycle current admitted work, or null before admission
   * @param pending pending intent, or null when the control has no pending request
   * @return complete immutable application view for real generated response mapping
   */
  private ControlView controlView(Cycle cycle, UUID pending) {
    return new ControlView(
        new Control(
            CONTROL,
            null,
            CollectionFamilyEnum.CLUB_SHEETS,
            0,
            true,
            pending,
            pending == null ? null : CollectionModeEnum.MANUAL,
            cycle == null ? null : cycle.id(),
            null,
            null,
            null,
            Set.of(),
            Set.of()),
        cycle);
  }

  /**
   * Supplies mobile authentication only; application tests use actual current SQL grants.
   *
   * @return validated mobile identity without fabricated business permissions
   */
  private RequestPostProcessor operator() {
    return jwt()
        .jwt(
            token -> token.issuer("https://identity.example.invalid/").claim("azp", "mobile-test"));
  }
}
