package com.blockout.backend.api.security.api;

import static com.blockout.shared.model.ApiProblemCodeEnum.*;

import com.blockout.backend.api.error.ApiProblems;
import com.blockout.shared.model.ApiProblemCodeEnum;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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

  public AuthenticationProblemHandler(JsonMapper json) {
    this.json = json;
  }

  @Override
  public void commence(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException failure)
      throws IOException {
    response.setHeader("WWW-Authenticate", "Bearer");
    write(response, HttpStatus.UNAUTHORIZED, AUTHENTICATION_REQUIRED);
  }

  @Override
  public void handle(
      HttpServletRequest request, HttpServletResponse response, AccessDeniedException failure)
      throws IOException {
    write(response, HttpStatus.FORBIDDEN, ACCESS_DENIED);
  }

  private void write(HttpServletResponse response, HttpStatus status, ApiProblemCodeEnum code)
      throws IOException {
    var problem = ApiProblems.create(status, code);
    response.setHeader("Cache-Control", "no-store");
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    json.writeValue(response.getOutputStream(), problem);
  }
}
