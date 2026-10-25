package com.blockout.backend.sporting.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

/** Guards privacy-sensitive restoration at the real persistence-to-value mapping boundary. */
@DisplayName("Sporting persistence mapping")
class SportingPersistenceMapperTest {
  private final SportingPersistenceMapper mapper =
      Mappers.getMapper(SportingPersistenceMapper.class);

  @Test
  @DisplayName("Discards restored restricted contact payloads before exposing detached values")
  void discardsRestoredRestrictedContacts() {
    // Given
    ClubEntity club =
        new ClubEntity(CollectionProviderEnum.FFVB, "synthetic-club", "Synthetic club");
    club.getEmail().setSourceValue("source@example.invalid");
    club.getEmail().setManualValue("manual@example.invalid");
    club.getEmail().setMode(ContactModeEnum.MANUAL);
    club.getEmail().setRestricted(true);

    // When
    SportingPresentation.Contacts contacts = mapper.toContacts(club);

    // Then
    SportingPresentation.ContactValue email =
        contacts.fields().get(SportingPresentation.ContactField.EMAIL);
    assertThat(email.restricted()).isTrue();
    assertThat(email.sourceValue()).isNull();
    assertThat(email.manualValue()).isNull();
    assertThat(email.effectiveValue()).isNull();
  }

  @Test
  @DisplayName("Suppresses a retained point when its municipality is currently hidden")
  void suppressesPointWithoutPermittedCity() {
    // Given
    ClubEntity club =
        new ClubEntity(CollectionProviderEnum.FFVB, "synthetic-club", "Synthetic club");
    club.getCity().setSourceValue("Synthetic city");
    club.getCity().setMode(ContactModeEnum.HIDDEN);
    club.setLatitude(48.1);
    club.setLongitude(2.1);

    // When
    SportingPresentation.Locality locality = mapper.toLocality(club);

    // Then
    assertThat(locality.city()).isNull();
    assertThat(locality.latitude()).isNull();
    assertThat(locality.longitude()).isNull();
  }
}
