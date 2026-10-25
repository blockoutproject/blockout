package com.blockout.backend.sporting.api;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.service.ValidateSportingImage;
import java.io.IOException;
import java.io.InputStream;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.AbstractResource;
import org.springframework.core.io.Resource;

/** Native body IO stays at the transport boundary rather than reaching image acceptance. */
@DisplayName("Sporting source image transport")
class SportingPresentationValidatorTest {
  @Test
  @DisplayName("Translates an unreadable source body to the existing opaque image refusal")
  void refusesUnreadableSourceBody() {
    // Given
    SportingPresentationValidator validator =
        new SportingPresentationValidator(new ValidateSportingImage());
    Resource unreadable =
        new AbstractResource() {
          /** {@inheritDoc} */
          @Override
          public String getDescription() {
            return "Synthetic unreadable body";
          }

          /** {@inheritDoc} */
          @Override
          public InputStream getInputStream() throws IOException {
            throw new IOException("Synthetic private diagnostic");
          }
        };

    // When
    ThrowingCallable read = () -> validator.validateImage(unreadable);

    // Then
    assertThatThrownBy(read)
        .isInstanceOf(SportingValidationException.class)
        .hasMessageNotContaining("Synthetic private diagnostic");
  }
}
