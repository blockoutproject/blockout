package com.blockout.backend.collection.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.collection.application.service.ChangeCollectionControls;
import com.blockout.backend.collection.application.service.CloseCollectionSeason;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Generated command routes reject malformed input before any application effect. */
@WebMvcTest(CollectionControlsController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  CurrentAccount.class,
  CollectionApiMapperImpl.class
})
@MockitoBean(types = com.blockout.backend.access.application.MaintenanceAdmission.class)
@DisplayName("Generated collection control validation")
class CollectionControlWebMvcTest {
  @Autowired private MockMvc mvc;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private ChangeCollectionControls controls;
  @MockitoBean private ReadCollectionConfiguration configurationReads;
  @MockitoBean private CloseCollectionSeason closure;

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

  /** Supplies mobile authentication only; application tests use actual current SQL grants. */
  private RequestPostProcessor operator() {
    return jwt()
        .jwt(
            token -> token.issuer("https://identity.example.invalid/").claim("azp", "mobile-test"));
  }
}
