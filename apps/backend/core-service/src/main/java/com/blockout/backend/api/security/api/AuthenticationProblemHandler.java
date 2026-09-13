package com.blockout.backend.api.security.api;

import com.blockout.backend.api.error.ApiProblems;
import com.blockout.shared.model.ApiProblemCodeEnum;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import tools.jackson.databind.json.JsonMapper;

/**
 * Stable HTTP failures: provider exceptions and token claims never enter client-facing responses.
 */
public final class AuthenticationProblemHandler
    implements AuthenticationEntryPoint, AccessDeniedHandler {
  private final JsonMapper json;

  /**
   * Uses the Boot mapper to serialize Spring ProblemDetail at the security filter boundary.
   *
   * @param json application mapper configured for native problem serialization
   */
  public AuthenticationProblemHandler(JsonMapper json) {
    this.json = json;
  }

  /** {@inheritDoc} */
  @Override
  public void commence(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException failure)
      throws IOException {
    response.setHeader("WWW-Authenticate", "Bearer");
    write(response, HttpStatus.UNAUTHORIZED, ApiProblemCodeEnum.AUTHENTICATION_REQUIRED);
  }

  /**
   * Rejects an invalid RevenueCat shared secret without an Auth0 Bearer challenge.
   *
   * @param request rejected webhook request; its body is not read
   * @param response servlet-owned response
   * @param failure Spring's rejected authorization result
   * @throws IOException if the response cannot be written
   */
  public void webhookAuthenticationRequired(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException failure)
      throws IOException {
    write(response, HttpStatus.UNAUTHORIZED, ApiProblemCodeEnum.WEBHOOK_AUTHENTICATION_FAILED);
  }

  /** {@inheritDoc} */
  @Override
  public void handle(
      HttpServletRequest request, HttpServletResponse response, AccessDeniedException failure)
      throws IOException {
    write(response, HttpStatus.FORBIDDEN, ApiProblemCodeEnum.ACCESS_DENIED);
  }

  /**
   * Writes an uncacheable problem to the servlet-owned response stream.
   *
   * @param response response owned by the servlet container
   * @param status authentication or authorization status
   * @param code safe generated problem code
   * @throws IOException the response stream cannot be written
   */
  private void write(HttpServletResponse response, HttpStatus status, ApiProblemCodeEnum code)
      throws IOException {
    ProblemDetail problem = ApiProblems.create(status, code);
    response.setHeader("Cache-Control", "no-store");
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    json.writeValue(response.getOutputStream(), problem);
  }
}
