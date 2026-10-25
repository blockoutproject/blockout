package com.blockout.backend.shared.http;

import com.blockout.backend.generated.mobile.model.ProblemResponse;
import java.net.URI;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** Maps safe HTTP error values to the shared generated profile used by mobile and ingestion. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class HttpProblems {
  /**
   * Creates only the common public fields; feature owners may add their contracted extensions.
   *
   * @param status canonical HTTP status
   * @param type complete authored problem identifier, never exception text
   * @return generated error body without request data or technical diagnostics
   */
  public static ProblemResponse body(HttpStatusCode status, String type) {
    return new ProblemResponse(
        URI.create(type), HttpStatus.valueOf(status.value()).getReasonPhrase(), status.value());
  }

  /**
   * Builds an opaque, non-cacheable feature error with the shared media type.
   *
   * @param status canonical HTTP status
   * @param type complete authored problem identifier
   * @return generated Problem Details response
   */
  public static ResponseEntity<Object> response(HttpStatusCode status, String type) {
    return response(body(status, type), HttpHeaders.EMPTY);
  }

  /**
   * Preserves native headers and feature extensions while enforcing the shared error profile.
   *
   * @param problem generated body containing only explicitly public fields
   * @param suppliedHeaders native protocol headers such as Allow or Accept
   * @return non-cacheable response with the same status as its body
   */
  public static ResponseEntity<Object> response(
      ProblemResponse problem, HttpHeaders suppliedHeaders) {
    HttpHeaders headers = new HttpHeaders();
    headers.putAll(suppliedHeaders);
    headers.setContentType(MediaType.APPLICATION_PROBLEM_JSON);
    headers.setCacheControl("no-store");
    return new ResponseEntity<>(problem, headers, HttpStatusCode.valueOf(problem.getStatus()));
  }
}
