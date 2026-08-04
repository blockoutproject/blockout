package com.blockout.users.user.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.users.user.api.mappers.UserApiMapper;
import com.blockout.users.user.application.UserService;
import com.blockout.users.user.application.commands.UpdateUserCommand;
import com.blockout.users.user.application.views.UserView;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.access.ExceptionTranslationFilter;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@SpringJUnitConfig(UserControllerWebMvcTest.TestConfiguration.class)
@DisplayName("User controller")
class UserControllerWebMvcTest {

  private static final String CURRENT_SUBJECT = "auth0|current";
  private static final String OTHER_SUBJECT = "auth0|other";

  @Autowired private UserController userController;
  @Autowired private UserService userService;

  private MockMvc mockMvc;
  private TestAuthenticationFilter authenticationFilter;

  @BeforeEach
  void setUp() {
    reset(userService);
    ExceptionTranslationFilter exceptionTranslationFilter =
        new ExceptionTranslationFilter(
            (request, response, exception) ->
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED));
    exceptionTranslationFilter.setAccessDeniedHandler(
        (request, response, exception) -> response.sendError(HttpServletResponse.SC_FORBIDDEN));
    authenticationFilter = new TestAuthenticationFilter();
    mockMvc =
        MockMvcBuilders.standaloneSetup(userController)
            .addFilters(authenticationFilter, exceptionTranslationFilter)
            .build();
  }

  @Test
  @DisplayName("updates the authenticated user's supported profile fields and image")
  void updatesTheAuthenticatedUsersSupportedProfileFieldsAndImage() throws Exception {
    authorize("allowed-token", "update:current_user");
    when(userService.updateUser(eq(CURRENT_SUBJECT), any())).thenReturn(updatedUser());

    MockMultipartFile image =
        new MockMultipartFile("image", "profile.png", "image/png", new byte[] {1, 2, 3});

    mockMvc
        .perform(
            multipart(HttpMethod.PUT, "/api/v1/users/{auth0Id}", CURRENT_SUBJECT)
                .file(image)
                .param("data", "{\"pseudo\":\"updated\",\"pictureUrl\":\"picture\"}")
                .header(HttpHeaders.AUTHORIZATION, "Bearer allowed-token"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.auth0Id").value(CURRENT_SUBJECT))
        .andExpect(jsonPath("$.pseudo").value("updated"));

    var command = org.mockito.ArgumentCaptor.forClass(UpdateUserCommand.class);
    verify(userService).updateUser(eq(CURRENT_SUBJECT), command.capture());
    assertThat(command.getValue().pseudo()).isEqualTo("updated");
    assertThat(command.getValue().pictureUrl()).isEqualTo("picture");
    assertThat(command.getValue().image().content()).containsExactly(1, 2, 3);
  }

  @Test
  @DisplayName("ignores a mismatched path subject when selecting the update target")
  void ignoresAMismatchedPathSubjectWhenSelectingTheUpdateTarget() throws Exception {
    authorize("allowed-token", "update:current_user");
    when(userService.updateUser(eq(CURRENT_SUBJECT), any())).thenReturn(updatedUser());

    mockMvc
        .perform(
            multipart(HttpMethod.PUT, "/api/v1/users/{auth0Id}", OTHER_SUBJECT)
                .param("data", "{\"pseudo\":\"updated\"}")
                .header(HttpHeaders.AUTHORIZATION, "Bearer allowed-token"))
        .andExpect(status().isOk());

    verify(userService).updateUser(eq(CURRENT_SUBJECT), any());
    verify(userService, never()).updateUser(eq(OTHER_SUBJECT), any());
  }

  @Test
  @DisplayName("rejects an update without authentication")
  void rejectsAnUpdateWithoutAuthentication() throws Exception {
    mockMvc
        .perform(
            multipart(HttpMethod.PUT, "/api/v1/users/{auth0Id}", CURRENT_SUBJECT)
                .param("data", "{\"pseudo\":\"updated\"}"))
        .andExpect(status().isUnauthorized());

    verify(userService, never()).updateUser(any(), any());
  }

  @Test
  @DisplayName("rejects an update without the current-user update permission")
  void rejectsAnUpdateWithoutTheCurrentUserUpdatePermission() throws Exception {
    authorize("denied-token", "read:current_user");

    mockMvc
        .perform(
            multipart(HttpMethod.PUT, "/api/v1/users/{auth0Id}", CURRENT_SUBJECT)
                .param("data", "{\"pseudo\":\"updated\"}")
                .header(HttpHeaders.AUTHORIZATION, "Bearer denied-token"))
        .andExpect(status().isForbidden());

    verify(userService, never()).updateUser(any(), any());
  }

  private void authorize(String tokenValue, String permission) {
    authenticationFilter.authorize(tokenValue, permission);
  }

  private UserView updatedUser() {
    Instant timestamp = Instant.parse("2026-08-03T12:00:00Z");
    return new UserView(
        1L,
        CURRENT_SUBJECT,
        "user@example.com",
        "updated",
        "First",
        "Last",
        "picture",
        "phone",
        true,
        timestamp,
        timestamp,
        List.of());
  }

  @Configuration(proxyBeanMethods = false)
  @EnableMethodSecurity(proxyTargetClass = true)
  static class TestConfiguration {

    @Bean
    UserService userService() {
      return mock(UserService.class);
    }

    @Bean
    UserApiMapper userApiMapper() {
      return new UserApiMapper();
    }

    @Bean
    ObjectMapper objectMapper() {
      return JsonMapper.builder().findAndAddModules().build();
    }

    @Bean
    UserController userController(
        UserService userService, UserApiMapper userApiMapper, ObjectMapper objectMapper) {
      return new UserController(userService, userApiMapper, objectMapper);
    }
  }

  static class TestAuthenticationFilter extends OncePerRequestFilter {

    private String tokenValue;
    private String permission;

    void authorize(String authorizedTokenValue, String authorizedPermission) {
      tokenValue = authorizedTokenValue;
      permission = authorizedPermission;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
      String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
      if (("Bearer " + tokenValue).equals(authorization)) {
        Instant now = Instant.parse("2026-08-03T12:00:00Z");
        Jwt jwt =
            Jwt.withTokenValue(tokenValue)
                .header("alg", "RS256")
                .subject(CURRENT_SUBJECT)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(300))
                .build();
        var authentication =
            new JwtAuthenticationToken(
                jwt, List.of(new SimpleGrantedAuthority("SCOPE_" + permission)));
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
      }

      try {
        filterChain.doFilter(request, response);
      } finally {
        SecurityContextHolder.clearContext();
      }
    }
  }
}
