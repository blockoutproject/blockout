package com.blockout.backend.legal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.AccessSettingsStore;
import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

/**
 * Exercises real routing, security and maintenance admission with bundled HTML, isolated fixtures
 * and controlled SQL. Synthetic fixtures never occupy a deployable static/legals path.
 */
@WebMvcTest(controllers = LegalDocumentsController.class)
@Import({SecurityConfiguration.class, ApiExceptionHandler.class, MaintenanceAdmission.class})
@ContextConfiguration(classes = LegalDocumentsWebMvcTest.LegalFixtureConfiguration.class)
@DisplayName("Public legal document routing")
class LegalDocumentsWebMvcTest {
  @Autowired private MockMvc mvc;

  @MockitoBean(name = "legalFixtureResources")
  private ResourceLoader resources;

  @MockitoBean private AccessSettingsStore settings;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private ActionAuthorization authorization;
  @MockitoBean private PlatformTransactionManager transactions;

  /** Keeps maintenance active; exact legal GETs must bypass it without reading current SQL. */
  @BeforeEach
  void activeMaintenance() {
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));
    when(transactions.getTransaction(any(TransactionDefinition.class)))
        .thenAnswer(invocation -> new SimpleTransactionStatus());
  }

  @ParameterizedTest
  @ValueSource(strings = {"imprint", "privacy", "terms"})
  @DisplayName("Returns the complete UTF-8 HTML anonymously through maintenance")
  void returnsCompletePublicDocument(String kind) throws Exception {
    // Given
    ClassPathResource fixture = new ClassPathResource("legal-fixtures/complete.html");
    when(resources.getResource("classpath:static/legals/" + kind + ".html")).thenReturn(fixture);

    // When / Then
    mvc.perform(get("/legals/" + kind))
        .andExpect(status().isOk())
        .andExpect(content().contentType("text/html;charset=UTF-8"))
        .andExpect(content().bytes(fixture.getContentAsByteArray()));
    verifyNoInteractions(settings, accounts, authorization, transactions);
  }

  @ParameterizedTest
  @ValueSource(strings = {"imprint", "privacy", "terms"})
  @DisplayName("Returns each actual bundled document unchanged at its public URL")
  void returnsBundledDocument(String kind) throws Exception {
    // Given
    ClassPathResource document = new ClassPathResource("static/legals/" + kind + ".html");
    when(resources.getResource("classpath:static/legals/" + kind + ".html")).thenReturn(document);

    // When / Then
    mvc.perform(get("/legals/" + kind))
        .andExpect(status().isOk())
        .andExpect(content().contentType("text/html;charset=UTF-8"))
        .andExpect(content().bytes(document.getContentAsByteArray()))
        .andExpect(header().doesNotExist("Set-Cookie"));
    verifyNoInteractions(settings, accounts, authorization, transactions);
  }

  @ParameterizedTest
  @ValueSource(strings = {"imprint", "privacy", "terms"})
  @DisplayName("Reports an absent resource honestly with a readable UTF-8 404 page")
  void reportsMissingDocument(String kind) throws Exception {
    // Given
    when(resources.getResource("classpath:static/legals/" + kind + ".html"))
        .thenReturn(new ClassPathResource("legal-fixtures/absent.html"));

    // When / Then
    mvc.perform(get("/legals/" + kind))
        .andExpect(status().isNotFound())
        .andExpect(content().contentType("text/html;charset=UTF-8"))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("Document indisponible")))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("réessayer")));
    verifyNoInteractions(settings, accounts, authorization, transactions);
  }

  @ParameterizedTest
  @ValueSource(strings = {"free", "pro", "unknown"})
  @DisplayName("Returns the same public resource without entitlement conditions")
  void ignoresEntitlement(String entitlement) throws Exception {
    // Given
    ClassPathResource fixture = new ClassPathResource("legal-fixtures/complete.html");
    when(resources.getResource("classpath:static/legals/privacy.html")).thenReturn(fixture);

    // When / Then
    mvc.perform(
            get("/legals/privacy")
                .with(
                    jwt()
                        .jwt(token -> token.claim("azp", "mobile-test").claim("pro", entitlement))))
        .andExpect(status().isOk())
        .andExpect(content().string(fixture.getContentAsString(StandardCharsets.UTF_8)));
    verifyNoInteractions(settings, accounts, authorization, transactions);
  }

  @ParameterizedTest
  @CsvSource({
    "POST,/legals/privacy",
    "PUT,/legals/terms",
    "DELETE,/legals/imprint",
    "GET,/legals/privacy.html",
    "GET,/legals/unknown"
  })
  @DisplayName("Does not extend public access to other methods or resource paths")
  void keepsPublicExceptionNarrow(String method, String path) throws Exception {
    // Given / When / Then
    mvc.perform(request(HttpMethod.valueOf(method), path)).andExpect(status().isUnauthorized());
    verifyNoInteractions(resources, settings, accounts, authorization, transactions);
  }

  @Test
  @DisplayName("Preserves ordinary public-resource maintenance refusal")
  void preservesOrdinaryMaintenance() throws Exception {
    // Given / When / Then
    mvc.perform(get("/clubs"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
    verifyNoInteractions(resources, accounts, authorization);
  }

  /** Binds fixture resources explicitly; Spring's context also implements ResourceLoader itself. */
  @TestConfiguration(proxyBeanMethods = false)
  static class LegalFixtureConfiguration {
    /**
     * Constructs the real controller with test-only resource selection, leaving MVC and security
     * real.
     *
     * @param resources controlled resource lookup outside the servlet boundary
     * @return controller exercising the same classpath names used by a release
     */
    @Bean
    LegalDocumentsController legalDocumentsController(
        @Qualifier("legalFixtureResources") ResourceLoader resources) {
      return new LegalDocumentsController(resources);
    }
  }
}
