package com.blockout.backend.shared.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.sporting.api.SportingIngestionController;
import com.blockout.backend.sporting.application.service.SportingImageService;
import java.io.ByteArrayInputStream;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.MethodParameter;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.ResourceHttpMessageConverter;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.web.server.ResponseStatusException;

/** Proves bounded binary reads before the native Resource converter can materialize the body. */
@DisplayName("Ingestion binary request bound")
class IngestionBodyLimitAdviceTest {
  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Rejects oversized source images without reading past the bounded detection byte")
  void boundsImageBeforeConversion(boolean declaredLength) throws Exception {
    // Given
    int length = SportingImageService.MAX_BYTES + 32;
    ByteArrayInputStream content = new ByteArrayInputStream(new byte[length]);
    MockHttpInputMessage message = new MockHttpInputMessage(content);
    if (declaredLength) message.getHeaders().setContentLength(length);
    MethodParameter parameter =
        new MethodParameter(
            SportingIngestionController.class.getMethod(
                "observeProfessionalTeamLogo",
                UUID.class,
                UUID.class,
                Long.class,
                OffsetDateTime.class,
                Resource.class,
                OffsetDateTime.class),
            4);
    IngestionBodyLimitAdvice advice = new IngestionBodyLimitAdvice();

    // When
    ThrowingCallable read =
        () ->
            advice.beforeBodyRead(
                message, parameter, Resource.class, ResourceHttpMessageConverter.class);

    // Then
    assertThatThrownBy(read)
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            failure -> assertThat(failure.getStatusCode()).isEqualTo(HttpStatus.CONTENT_TOO_LARGE));
    assertThat(content.available()).isEqualTo(declaredLength ? length : 31);
  }
}
