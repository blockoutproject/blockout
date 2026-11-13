package com.blockout.backend.notifications.api;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.notifications.application.InboxViews;
import com.blockout.backend.notifications.application.MarkNotificationRead;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.notifications.application.ReadInbox;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.util.List;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Qualifies ordinary query binding through the production inbox controller. */
@WebMvcTest(controllers = NotificationsController.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  NotificationRequest.class,
  NotificationApiMapperImpl.class,
  com.blockout.backend.sporting.api.ConsultationApiMapperImpl.class,
  NotificationExceptionHandler.class
})
@DisplayName("Notification HTTP contract values")
class NotificationContractWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000237");
  private static final String ROOT = "/accounts/" + ACCOUNT;
  @Autowired private MockMvc mvc;
  @MockitoBean private CurrentAccount account;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private MaintenanceAdmission admission;
  @MockitoBean private ReadInbox reads;
  @MockitoBean private MarkNotificationRead marks;

  @ParameterizedTest
  @ValueSource(strings = {"?opened=true", "?accountId=foreign"})
  @DisplayName("Ignores undeclared query parameters through ordinary MVC binding")
  void ignoresUndeclaredQueries(String query) throws Exception {
    // Given
    NotificationContext owner = new NotificationContext(ACCOUNT);
    when(account.id()).thenReturn(ACCOUNT);
    when(reads.page(owner, null)).thenReturn(new InboxViews.Page(List.of(), null));
    MockHttpServletRequestBuilder request =
        get(ROOT + "/notifications" + query)
            .with(jwt().jwt(token -> token.claim("azp", "mobile-test")));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isOk());
    verify(reads).page(owner, null);
  }
}
