package com.blockout.backend.notifications.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.notifications.application.ChangePushSubscriptions;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.notifications.application.PushSubscriptionConflictException;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Association;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Replacement;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Generated binding, current-owner admission and private status/body semantics with a controlled command owner. */
@WebMvcTest(PushSubscriptionsController.class)
@Import({SecurityConfiguration.class, HttpConfiguration.class, ApiExceptionHandler.class, NotificationRequest.class, NotificationApiMapperImpl.class, com.blockout.backend.sporting.api.ConsultationApiMapperImpl.class, NotificationExceptionHandler.class, PushSubscriptionExceptionHandler.class})
@DisplayName("Push subscription HTTP operations")
class PushSubscriptionsWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID ID = UUID.fromString("10000000-0000-4000-8000-000000000001");
  private static final UUID INSTALLATION = UUID.fromString("20000000-0000-4000-8000-000000000001");
  private static final String RESOURCE = "/accounts/" + ACCOUNT + "/push-subscriptions/" + ID;
  private static final String BODY = "{\"installationId\":\"" + INSTALLATION + "\",\"expoPushToken\":\"Expo[synthetic]\"}";
  @Autowired private MockMvc mvc;
  @MockitoBean private CurrentAccount account;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private MaintenanceAdmission admission;
  @MockitoBean private ChangePushSubscriptions changes;

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Returns creation Location or replacement status without private address")
  void registers(boolean created) throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);
    when(changes.replace(any())).thenReturn(new Replacement(new Association(ID, INSTALLATION, ACCOUNT), created));

    // When
    mvc.perform(put(RESOURCE).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))).contentType(MediaType.APPLICATION_JSON).content(BODY))
        // Then
        .andExpect(status().is(created ? 201 : 200))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(created ? header().string("Location", RESOURCE) : header().doesNotExist("Location"))
        .andExpect(jsonPath("$.id").value(ID.toString()))
        .andExpect(jsonPath("$.installationId").value(INSTALLATION.toString()))
        .andExpect(jsonPath("$.expoPushToken").doesNotExist())
        .andExpect(jsonPath("$.accountId").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(strings = {"{}", "{\"installationId\":null,\"expoPushToken\":\"x\"}", "{\"installationId\":\"20000000-0000-4000-8000-000000000001\",\"expoPushToken\":null}", "{\"installationId\":\"20000000-0000-4000-8000-000000000001\",\"expoPushToken\":\"\"}", "{\"installationId\":\"20000000-0000-4000-8000-000000000001\",\"expoPushToken\":\"x\",\"revision\":1}"})
  @DisplayName("Rejects incomplete, null and additional registration fields before any write")
  void refusesInvalidBody(String body) throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);

    // When
    mvc.perform(put(RESOURCE).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))).contentType(MediaType.APPLICATION_JSON).content(body))
        // Then
        .andExpect(status().isBadRequest());
    verifyNoInteractions(changes);
  }

  @Test
  @DisplayName("Exact absent deletion succeeds without JSON")
  void removesExactAssociation() throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);

    // When
    mvc.perform(delete(RESOURCE).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isNoContent()).andExpect(content().string(""))
        .andExpect(header().string("Cache-Control", "no-store"));
    verify(changes).remove(new NotificationContext(ACCOUNT), ID);
  }

  @Test
  @DisplayName("Uniqueness conflict returns the canonical private conflict")
  void reportsConflict() throws Exception {
    // Given
    when(account.id()).thenReturn(ACCOUNT);
    when(changes.replace(any())).thenThrow(new PushSubscriptionConflictException());

    // When
    mvc.perform(put(RESOURCE).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))).contentType(MediaType.APPLICATION_JSON).content(BODY))
        // Then
        .andExpect(status().isConflict()).andExpect(jsonPath("$.type").value("urn:blockout:problem:conflict"))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Foreign account resources are hidden before writes")
  void hidesForeignOwner() throws Exception {
    // Given
    when(account.id()).thenReturn(UUID.fromString("00000000-0000-4000-8000-000000000002"));

    // When
    mvc.perform(put(RESOURCE).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))).contentType(MediaType.APPLICATION_JSON).content(BODY))
        // Then
        .andExpect(status().isNotFound());
    verifyNoInteractions(changes);
  }
}
