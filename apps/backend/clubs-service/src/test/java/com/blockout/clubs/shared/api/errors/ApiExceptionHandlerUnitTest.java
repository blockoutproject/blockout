package com.blockout.clubs.shared.api.errors;

import com.blockout.clubs.club.application.exceptions.ClubNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies stable ProblemDetail responses at the clubs-service API boundary.
 */
@DisplayName("Clubs API exception handler")
class ApiExceptionHandlerUnitTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler(new ApiProblemFactory());

    /**
     * Verifies the stable not-found status, code, and non-sensitive detail.
     */
    @DisplayName("maps a missing Club to a stable not-found problem")
    @Test
    void mapsMissingClubToStableNotFoundProblem() {
        ResponseEntity<ProblemDetail> response = handler.handleNotFound(new ClubNotFoundException("club-1"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getProperties()).containsEntry("code", "club_not_found");
        assertThat(response.getBody().getDetail()).isEqualTo("Club not found with id club-1");
    }

    /**
     * Verifies that unexpected exception details never cross the HTTP boundary.
     */
    @DisplayName("hides unexpected exception details")
    @Test
    void hidesUnexpectedExceptionDetails() {
        ResponseEntity<ProblemDetail> response = handler.handleUnexpected(new RuntimeException("private provider detail"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getProperties()).containsEntry("code", "internal_server_error");
        assertThat(response.getBody().getDetail()).isEqualTo("An internal error occurred.");
    }
}
