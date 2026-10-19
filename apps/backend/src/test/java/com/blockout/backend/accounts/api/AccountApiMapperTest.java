package com.blockout.backend.accounts.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.generated.mobile.model.AccountPermissionsResponse;
import com.blockout.backend.generated.mobile.model.AccountResponse;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mapstruct.factory.Mappers;

/** Verifies the actual generated account representation and its shared capability mapping. */
@DisplayName("Account response mapping")
class AccountApiMapperTest {
  private final AccountApiMapper mapper = Mappers.getMapper(AccountApiMapper.class);

  @ParameterizedTest
  @CsvSource({
    "MANAGE_MAINTENANCE, true, false, false, false, false, false, false, false",
    "MANAGE_APPLICATION_VERSIONS, false, true, false, false, false, false, false, false",
    "BYPASS_MAINTENANCE, false, false, true, false, false, false, false, false",
    "MANAGE_SPORTING_PRESENTATION, false, false, false, true, false, false, false, false",
    "MANAGE_SPORTING_CLASSIFICATION, false, false, false, false, true, false, false, false",
    "MANAGE_DIVISION_LIFECYCLE, false, false, false, false, false, true, false, false",
    "MANAGE_COLLECTION, false, false, false, false, false, false, true, false",
    "MODERATE_STREAM_LINKS, false, false, false, false, false, false, false, true"
  })
  @DisplayName("Maps each action to its sole canonical capability")
  void mapsIndependentCapability(
      Permission permission,
      boolean maintenance,
      boolean versions,
      boolean bypass,
      boolean presentation,
      boolean classification,
      boolean divisions,
      boolean collection,
      boolean moderation) {
    // Given
    Set<Permission> grants = Set.of(permission);

    // When
    AccountPermissionsResponse result = mapper.toDto(grants);

    // Then
    assertThat(result)
        .extracting(
            AccountPermissionsResponse::getManageMaintenance,
            AccountPermissionsResponse::getManageApplicationVersions,
            AccountPermissionsResponse::getBypassMaintenance,
            AccountPermissionsResponse::getManageSportingPresentation,
            AccountPermissionsResponse::getManageSportingClassification,
            AccountPermissionsResponse::getManageDivisionLifecycle,
            AccountPermissionsResponse::getManageCollection,
            AccountPermissionsResponse::getModerateStreamLinks)
        .containsExactly(
            maintenance,
            versions,
            bypass,
            presentation,
            classification,
            divisions,
            collection,
            moderation);
  }

  @Test
  @DisplayName("Preserves profile identity, known principal age and accepted photo presence")
  void mapsCurrentProfile() {
    // Given
    Account account =
        new Account(
            UUID.fromString("00000000-0000-4000-8000-000000000152"),
            "https://identity.example.invalid/",
            "auth0|mapper",
            "Player_152",
            "player@example.invalid",
            Instant.parse("2020-01-02T03:04:05Z"));

    // When
    AccountResponse result =
        mapper.toDto(
            account, true, Set.of(Permission.MANAGE_MAINTENANCE, Permission.BYPASS_MAINTENANCE));

    // Then
    assertThat(result.getAccountId()).isEqualTo(account.id());
    assertThat(result.getUsername()).isEqualTo(account.username());
    assertThat(result.getEmail()).isEqualTo(account.email());
    assertThat(result.getPrincipalCreatedAt().get())
        .isEqualTo(account.principalCreatedAt().atOffset(ZoneOffset.UTC));
    assertThat(result.getHasPhoto()).isTrue();
    assertThat(result.getPermissions().getManageMaintenance()).isTrue();
    assertThat(result.getPermissions().getBypassMaintenance()).isTrue();
    assertThat(result.getPermissions().getManageApplicationVersions()).isFalse();
  }

  @Test
  @DisplayName(
      "Keeps an unknown principal date explicitly null without granting ordinary accounts privileges")
  void preservesUnknownAge() {
    // Given
    Account account =
        new Account(
            UUID.fromString("00000000-0000-4000-8000-000000000152"),
            "https://identity.example.invalid/",
            "auth0|mapper",
            "Player_152",
            "player@example.invalid",
            null);

    // When
    AccountResponse result = mapper.toDto(account, false, Set.of());

    // Then
    assertThat(result.getPrincipalCreatedAt().isPresent()).isTrue();
    assertThat(result.getPrincipalCreatedAt().get()).isNull();
    assertThat(result.getHasPhoto()).isFalse();
    assertThat(result.getPermissions())
        .extracting(
            AccountPermissionsResponse::getManageMaintenance,
            AccountPermissionsResponse::getManageApplicationVersions,
            AccountPermissionsResponse::getBypassMaintenance,
            AccountPermissionsResponse::getManageSportingPresentation,
            AccountPermissionsResponse::getManageSportingClassification,
            AccountPermissionsResponse::getManageDivisionLifecycle,
            AccountPermissionsResponse::getManageCollection,
            AccountPermissionsResponse::getModerateStreamLinks)
        .containsOnly(false);
  }
}
