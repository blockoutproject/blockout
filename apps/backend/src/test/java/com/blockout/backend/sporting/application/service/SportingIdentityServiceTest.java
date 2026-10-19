package com.blockout.backend.sporting.application.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.blockout.backend.sporting.application.exception.UnresolvedSportingIdentityException;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Exercises the unresolved-participant boundary before persistence is consulted. */
@DisplayName("Sporting identity decisions")
class SportingIdentityServiceTest {
  @Test
  @DisplayName("Rejects an undetermined participant before consulting persistence")
  void rejectsUndeterminedParticipant() {
    // Given
    SportingStore store = mock(SportingStore.class);
    SportingIdentityService service = new SportingIdentityService(store);
    UUID pool = UUID.fromString("00000000-0000-4000-8000-000000000001");
    TeamCandidate away = new TeamCandidate(null, "Synthetic visitor", "0002", null);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable identify =
        () -> service.identifyMatch(pool, "M1", null, away);

    // Then
    assertThatThrownBy(identify).isInstanceOf(UnresolvedSportingIdentityException.class);
    verifyNoInteractions(store);
  }
}
