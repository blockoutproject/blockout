package com.blockout.backend.api.error;

import com.blockout.shared.model.ApiProblemCodeEnum;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;

/** Shared HTTP error vocabulary; dependency diagnostics never become client-facing details. */
public final class ApiProblems {
  /** Prevents instances of the shared HTTP problem factory. */
  private ApiProblems() {}

  /**
   * Builds a native problem using only the generated code and fixed safe detail text.
   *
   * @param status HTTP status selected by the owning adapter
   * @param code generated wire code representing the failure
   * @return a fresh ProblemDetail with no provider or request content
   */
  public static ProblemDetail create(HttpStatusCode status, ApiProblemCodeEnum code) {
    var detail =
        switch (code) {
          case AUTHENTICATION_REQUIRED -> "Authentication required.";
          case ACCESS_DENIED -> "Access denied.";
          case USER_IDENTITY_REQUIRED -> "A supported native user session is required.";
          case USER_NOT_FOUND -> "The current profile does not exist.";
          case USER_INACTIVE -> "The current profile is inactive.";
          case IDENTITY_NOT_SUPPORTED, IDENTITY_MISMATCH ->
              "The identity cannot be used to create this profile.";
          case IDENTITY_PROVIDER_UNAVAILABLE, IDENTITY_CONFIGURATION_ERROR ->
              "Identity verification is temporarily unavailable.";
          case PROFILE_STORE_UNAVAILABLE, SERVICE_UNAVAILABLE ->
              "The service is temporarily unavailable.";
          case INTERNAL_ERROR -> "The request could not be completed.";
          case INVALID_REQUEST -> "The request is invalid.";
          case RESOURCE_NOT_FOUND -> "The requested resource does not exist.";
          case METHOD_NOT_ALLOWED -> "The HTTP method is not supported for this resource.";
          case RESPONSE_NOT_ACCEPTABLE -> "The requested response format is not supported.";
          case MEDIA_TYPE_NOT_SUPPORTED -> "The request content type is not supported.";
        };
    var problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setProperty("code", code.getValue());
    return problem;
  }
}
