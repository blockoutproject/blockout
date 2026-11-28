package com.blockout.backend.access.api;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.domain.MaintenanceRequiredException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * Applies F12 after mobile authentication/authorization and before ordinary handler effects. Exact
 * exceptions and existing F05 admission bindings are selected by security configuration; this
 * filter is installed only in the mobile chain, never ingestion or health.
 */
@RequiredArgsConstructor
public class MaintenanceAdmissionFilter extends OncePerRequestFilter {
  private final MaintenanceAdmission admission;
  private final RequestMatcher independentlyAdmitted;
  private final HandlerExceptionResolver problems;

  /** {@inheritDoc} */
  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return independentlyAdmitted.matches(request);
  }

  /**
   * {@inheritDoc}
   *
   * <p>Only canonical single-valued intent reaches the current SQL policy. Native security retains
   * guest/permission refusals; the existing MVC advice serializes typed or generic unavailability.
   */
  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    try {
      boolean bypass = MaintenanceBypass.requested(request);
      Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
      JwtAuthenticationToken principal =
          authentication instanceof JwtAuthenticationToken jwt ? jwt : null;
      admission.requireOrdinaryAccess(
          principal == null ? null : principal.getToken().getClaimAsString("iss"),
          principal == null ? null : principal.getToken().getSubject(),
          bypass);
    } catch (MaintenanceRequiredException
        | ResponseStatusException
        | AccountUnavailableException failure) {
      problems.resolveException(request, response, null, failure);
      return;
    }
    chain.doFilter(request, response);
  }
}
