package com.blockout.backend.sporting.application.model;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.SportingPresentation.DivisionDefinition;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

/** The application invariant applies before any HTTP or non-HTTP creation can reach storage. */
@DisplayName("Division creation metadata")
class DivisionDefinitionTest {
  @ParameterizedTest
  @NullSource
  @ValueSource(strings = {"", " ", "\t\n"})
  @DisplayName("Rejects absent or blank division names independently from HTTP validation")
  void refusesUnusableName(String name) {
    // Given
    String color = "#112233";

    // When
    ThrowingCallable create = () -> new DivisionDefinition(name, color, null);

    // Then
    assertThatThrownBy(create).isInstanceOf(SportingValidationException.class);
  }
}
