package com.blockout.backend.shared.http;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.server.ResponseStatusException;

/** Exercises the native resolver lifecycle retained by the shared public-error customization. */
@DisplayName("Native MVC error response lifecycle")
class ApiExceptionHandlerTest {
  @Test
  @DisplayName("Leaves an already committed response untouched")
  void leavesCommittedResponseUntouched() throws Exception {
    // Given
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();
    response.getWriter().write("delivered");
    response.flushBuffer();
    ApiExceptionHandler handler = new ApiExceptionHandler();
    ResponseStatusException failure = new ResponseStatusException(HttpStatus.BAD_REQUEST);

    // When
    ResponseEntity<Object> replacement =
        handler.handleException(failure, new ServletWebRequest(request, response));

    // Then
    assertThat(replacement).isNull();
    assertThat(response.getContentAsString()).isEqualTo("delivered");
  }
}
