package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.access.application.AccessSettingsStore;
import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.domain.MaintenanceRequiredException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarRequest;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.SportingVisibility.Reason;
import com.blockout.backend.sporting.application.port.SportingReadStore;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.time.ZoneId;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Reuses real F02/F12 decisions with controlled stores; no SQL or HTTP qualification is claimed.
 */
@DisplayName("Consultation current owner access")
class ConsultationAccessTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000001");

  @Test
  @DisplayName("Admits ordinary public reads without consulting a usable account or permissions")
  void admitsGuest() {
    // Given
    AccessSettingsStore settings = mock(AccessSettingsStore.class);
    AccountAccess accounts = mock(AccountAccess.class);
    ActionAuthorization authorization = mock(ActionAuthorization.class);
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Prepared", null));
    MaintenanceAdmission admission =
        new MaintenanceAdmission(
            settings, accounts, authorization, mock(PlatformTransactionManager.class));

    // When
    Optional<UUID> result = admission.requireOrdinaryAccess(null, null, false);

    // Then
    assertThat(result).isEmpty();
    verifyNoInteractions(accounts, authorization);
  }

  @Test
  @DisplayName("Keeps explicit bypass subject to the current account grant")
  void rechecksBypassGrant() {
    // Given
    AccessSettingsStore settings = mock(AccessSettingsStore.class);
    AccountAccess accounts = mock(AccountAccess.class);
    ActionAuthorization authorization = mock(ActionAuthorization.class);
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, true, "Maintenance", null));
    when(accounts.currentId("https://identity.example.invalid/", "synthetic-subject"))
        .thenReturn(Optional.of(ID));
    MaintenanceAdmission admission =
        new MaintenanceAdmission(
            settings, accounts, authorization, mock(PlatformTransactionManager.class));
    assertThat(
            admission.requireOrdinaryAccess(
                "https://identity.example.invalid/", "synthetic-subject", true))
        .contains(ID);
    doThrow(new AccessDeniedException("Refused"))
        .when(authorization)
        .require(ID, Permission.BYPASS_MAINTENANCE);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () ->
            admission.requireOrdinaryAccess(
                "https://identity.example.invalid/", "synthetic-subject", true);

    // Then
    assertThatThrownBy(read).isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @DisplayName("Refuses anonymous explicit bypass during maintenance")
  void refusesGuestBypass() {
    // Given
    AccessSettingsStore settings = mock(AccessSettingsStore.class);
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, true, "Maintenance", null));
    MaintenanceAdmission admission =
        new MaintenanceAdmission(
            settings,
            mock(AccountAccess.class),
            mock(ActionAuthorization.class),
            mock(PlatformTransactionManager.class));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> admission.requireOrdinaryAccess(null, null, true);

    // Then
    assertThatThrownBy(read).isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> admission.requireOrdinaryAccess(null, null, false))
        .isInstanceOf(MaintenanceRequiredException.class);
  }

  @ParameterizedTest
  @EnumSource(Reason.class)
  @DisplayName(
      "Suppresses retained match facts for every current F02 restriction including unknown date")
  void suppressesRestrictedFacts(Reason reason) {
    // Given
    SportingStore facts = mock(SportingStore.class);
    SportingReadStore current = mock(SportingReadStore.class);
    when(current.visibility(Kind.MATCH, ID))
        .thenReturn(Optional.of(new SportingVisibility(ID, Kind.MATCH, Set.of(reason))));
    ReadSportingData reads =
        new ReadSportingData(
            facts,
            org.mapstruct.factory.Mappers.getMapper(
                com.blockout.backend.sporting.application.model.SportingModelMapper.class),
            current);

    // When
    Optional<MatchView> match = reads.publicMatch(ID);

    // Then
    assertThat(match).isEmpty();
    verifyNoInteractions(facts);
  }

  @Test
  @DisplayName("Rechecks owner visibility on the next read without retaining a second registry")
  void rechecksVisibility() {
    // Given
    SportingStore facts = mock(SportingStore.class);
    SportingReadStore current = mock(SportingReadStore.class);
    MatchView match = new MatchView(ID, ID, "source-reference", ID, ID);
    when(facts.match(ID)).thenReturn(Optional.of(match));
    when(current.visibility(Kind.MATCH, ID))
        .thenReturn(
            Optional.of(new SportingVisibility(ID, Kind.MATCH, Set.of())),
            Optional.of(new SportingVisibility(ID, Kind.MATCH, Set.of(Reason.DATE_UNKNOWN))));
    ReadSportingData reads =
        new ReadSportingData(
            facts,
            org.mapstruct.factory.Mappers.getMapper(
                com.blockout.backend.sporting.application.model.SportingModelMapper.class),
            current);
    assertThat(reads.publicMatch(ID)).contains(match);

    // When
    Optional<MatchView> result = reads.publicMatch(ID);

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("Keeps a club calendar bound to its selected season")
  void requiresClubSeason() {
    // Given
    ZoneId groupingZone = ZoneId.of("Europe/Paris");

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () ->
            new CalendarRequest(
                Kind.CLUB, ID, null, CalendarCategoryEnum.UPCOMING, groupingZone, null);

    // Then
    assertThatThrownBy(read).isInstanceOf(IllegalArgumentException.class);
  }

  @ParameterizedTest
  @EnumSource(
      value = Kind.class,
      names = {"TEAM", "POOL", "MATCH"})
  @DisplayName("Rejects a season on team/pool selectors and excludes match as a calendar selector")
  void rejectsWrongSelector(Kind kind) {
    // Given
    ZoneId groupingZone = ZoneId.of("Europe/Paris");

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> new CalendarRequest(kind, ID, ID, CalendarCategoryEnum.UPCOMING, groupingZone, null);

    // Then
    assertThatThrownBy(read).isInstanceOf(IllegalArgumentException.class);
  }
}
