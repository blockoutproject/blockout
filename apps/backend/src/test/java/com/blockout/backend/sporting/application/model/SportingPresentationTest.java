package com.blockout.backend.sporting.application.model;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactValue;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/** Current owner values enforce privacy independently of persistence and transport adapters. */
@DisplayName("Sporting presentation values")
class SportingPresentationTest {
  @ParameterizedTest
  @EnumSource(ContactModeEnum.class)
  @DisplayName("A restricted contact retains no source or manual value in any mode")
  void clearsRestrictedValues(ContactModeEnum mode) {
    // Given
    String source = "source@example.invalid";
    String manual = "manual@example.invalid";

    // When
    ContactValue contact = new ContactValue(source, manual, mode, true);

    // Then
    assertThat(contact.sourceValue()).isNull();
    assertThat(contact.manualValue()).isNull();
    assertThat(contact.effectiveValue()).isNull();
    assertThat(contact.restricted()).isTrue();
  }
}
