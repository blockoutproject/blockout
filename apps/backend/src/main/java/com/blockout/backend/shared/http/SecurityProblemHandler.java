package com.blockout.backend.shared.http;

import com.blockout.backend.generated.mobile.model.ProblemResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.server.resource.BearerTokenError;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import tools.jackson.databind.json.JsonMapper;

/** Writes the canonical safe problem profile for failures occurring before MVC dispatch. */
@RequiredArgsConstructor
public class SecurityProblemHandler implements AuthenticationEntryPoint, AccessDeniedHandler {
  private final JsonMapper mapper;
  private final BearerTokenAuthenticationEntryPoint authentication =
      new BearerTokenAuthenticationEntryPoint();
  private final BearerTokenAccessDeniedHandler authorization = new BearerTokenAccessDeniedHandler();

  /** {@inheritDoc} */
  @Override
  public void commence(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException failure)
      throws IOException {
    AuthenticationException safeFailure = failure;
    if (failure instanceof OAuth2AuthenticationException oauth
        && oauth.getError() instanceof BearerTokenError bearer) {
      // Keep native status/error semantics while excluding decoder text and rejected values.
      safeFailure =
          new OAuth2AuthenticationException(
              new BearerTokenError(bearer.getErrorCode(), bearer.getHttpStatus(), null, null),
              failure);
    }
    authentication.commence(request, response, safeFailure);
    HttpStatus status = HttpStatus.valueOf(response.getStatus());
    write(
        response,
        status,
        status == HttpStatus.BAD_REQUEST
            ? "urn:blockout:problem:invalid-request"
            : "urn:blockout:problem:unauthenticated");
  }

  /** {@inheritDoc} */
  @Override
  public void handle(
      HttpServletRequest request, HttpServletResponse response, AccessDeniedException failure)
      throws IOException {
    authorization.handle(request, response, failure);
    write(response, HttpStatus.FORBIDDEN, "urn:blockout:problem:forbidden");
  }

  /**
   * Serializes only fixed public error fields, without exception messages or request references.
   *
   * @param response caller-owned response
   * @param status authentication or authorization refusal
   * @param type canonical machine-readable problem type
   * @throws IOException if the response cannot be written
   */
  private void write(HttpServletResponse response, HttpStatus status, String type)
      throws IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
    mapper.writeValue(
        response.getOutputStream(),
        new ProblemResponse(URI.create(type), status.getReasonPhrase(), status.value()));
  }
}
