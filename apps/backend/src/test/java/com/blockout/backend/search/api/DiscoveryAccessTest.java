package com.blockout.backend.search.api;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.application.PermissionStore;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.mobile.model.ClubSearchResponse;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import jakarta.servlet.http.HttpServletRequest;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Real shared security/current-account/grant boundaries with controlled persistence inputs. The
 * test-only adapter composes bypass admission; installed F12 maintenance remains unqualified.
 * SecurityWebMvcTest owns real signature, expiry and environment-audience qualification.
 */
@WebMvcTest(
    controllers = DiscoveryAccessTest.AccessAdapter.class,
    properties = {
      "blockout.security.issuer=https://identity.example.invalid/",
      "blockout.security.mobile-audience=mobile-test",
      "blockout.security.mobile-client-id=mobile-client",
      "blockout.security.ingestion-audience=collector-test",
      "blockout.security.ingestion-client-id=collector-client"
    })
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  DiscoveryWebConfiguration.class,
  ApiExceptionHandler.class,
  CurrentAccount.class,
  CurrentPermissions.class,
  DiscoveryRequest.class,
  DiscoveryAccessTest.AccessAdapter.class
})
@DisplayName("Discovery shared access boundaries")
class DiscoveryAccessTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000001");
  @Autowired MockMvc mvc;
  @MockitoBean AccountAccess accounts;
  @MockitoBean PermissionStore permissions;

  @ParameterizedTest
  @ValueSource(
      strings = {"/clubs", "/teams", "/pools", "/sporting-search-options?resourceType=team"})
  @DisplayName("Admits public discovery without an account lookup")
  void admitsGuest(String path) throws Exception {
    // Given
    // Request credentials below are controlled independently of account persistence.

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(accounts, permissions);
  }

  @ParameterizedTest
  @ValueSource(strings = {"free", "pro", "unknown"})
  @DisplayName("Ignores entitlement claims for ordinary public search")
  void admitsPublicRights(String entitlement) throws Exception {
    // Given
    // Request credentials below are controlled independently of account persistence.

    // When
    ResultActions response =
        mvc.perform(
            get("/clubs")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .claim("azp", "mobile-client")
                                    .claim("entitlement", entitlement))));

    // Then
    response.andExpect(status().isOk());
    verifyNoInteractions(accounts, permissions);
  }

  @Test
  @DisplayName("Refuses explicit bypass without a bearer instead of downgrading")
  void refusesMissingBypassIdentity() throws Exception {
    // Given
    // Request credentials below are controlled independently of account persistence.

    // When
    ResultActions response =
        mvc.perform(get("/clubs").header("Blockout-Maintenance-Bypass", "true"));

    // Then
    response
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(accounts, permissions);
  }

  @Test
  @DisplayName("Refuses a malformed explicit bearer through native authentication")
  void refusesInvalidBearer() throws Exception {
    // Given
    // Request credentials below are controlled independently of account persistence.

    // When
    ResultActions response =
        mvc.perform(
            get("/clubs")
                .header("Blockout-Maintenance-Bypass", "true")
                .header("Authorization", "Bearer malformed"));

    // Then
    response
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unauthenticated"));
    verifyNoInteractions(accounts, permissions);
  }

  @Test
  @DisplayName("Rejects bypass from an authenticated wrong mobile client")
  void refusesWrongClient() throws Exception {
    // Given
    // Request credentials below are controlled independently of account persistence.

    // When
    ResultActions response =
        mvc.perform(
            get("/clubs")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(jwt().jwt(token -> token.claim("azp", "different-client"))));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(accounts, permissions);
  }

  @Test
  @DisplayName("Requires the current bypass grant on each admitted request")
  void rechecksCurrentGrant() throws Exception {
    // Given
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
    when(permissions.findByAccountId(ACCOUNT))
        .thenReturn(Set.of(Permission.BYPASS_MAINTENANCE), Set.of());

    // When
    ResultActions admitted =
        mvc.perform(
            get("/clubs")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .subject("subject")
                                    .claim("azp", "mobile-client"))));

    // Then
    admitted.andExpect(status().isOk());
    mvc.perform(
            get("/clubs")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .subject("subject")
                                    .claim("azp", "mobile-client"))))
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  /**
   * Test-only admission composition using existing account/grant owners; no production gate is
   * installed.
   */
  @RestController
  static class AccessAdapter extends DiscoveryContractTest.Adapter {
    private final CurrentAccount account;
    private final CurrentPermissions permissions;

    /**
     * Supplies shared current identity/grants before exercising the generated request binding.
     *
     * @param requests real discovery binding
     * @param request native current request
     * @param account shared principal-to-account owner
     * @param permissions shared current grant owner
     */
    AccessAdapter(
        DiscoveryRequest requests,
        HttpServletRequest request,
        CurrentAccount account,
        CurrentPermissions permissions) {
      super(requests, request);
      this.account = account;
      this.permissions = permissions;
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<ClubSearchResponse> listClubs(
        String q, String cursor, Set<UUID> exampleIds, Boolean bypass) {
      if (bypass) {
        if (!(SecurityContextHolder.getContext().getAuthentication()
            instanceof JwtAuthenticationToken))
          throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (!permissions.forAccount(account.id()).contains(Permission.BYPASS_MAINTENANCE))
          throw new AccessDeniedException("Bypass is not permitted");
      }
      return super.listClubs(q, cursor, exampleIds, bypass);
    }
  }
}
