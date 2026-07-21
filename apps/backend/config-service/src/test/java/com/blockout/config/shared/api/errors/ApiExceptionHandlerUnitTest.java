package com.blockout.config.shared.api.errors;

import com.blockout.config.shared.application.ConfigResourceNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies stable and non-sensitive config-service errors.
 */
@DisplayName("Config API exception handler")
class ApiExceptionHandlerUnitTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler(new ApiProblemFactory());

    /**
     * Preserves the resource-specific code in a not-found problem.
     */
    @Test
    @DisplayName("maps a missing configuration resource to its stable problem code")
    void mapsNotFoundProblem() {
        ResponseEntity<ProblemDetail> response = handler.handleNotFound(
            new ConfigResourceNotFoundException("division_not_found", "Division not found."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getProperties()).containsEntry("code", "division_not_found");
    }

    /**
     * Hides the original failure detail from the public server-error response.
     */
    @Test
    @DisplayName("hides unexpected exception details")
    void hidesUnexpectedDetails() {
        ResponseEntity<ProblemDetail> response = handler.handleUnexpected(new RuntimeException("secret"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("An internal error occurred.");
        assertThat(response.getBody().getDetail()).doesNotContain("secret");
    }
}
