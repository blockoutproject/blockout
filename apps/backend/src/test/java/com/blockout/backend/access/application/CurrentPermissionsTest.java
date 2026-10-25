package com.blockout.backend.access.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import java.util.Set;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.access.AccessDeniedException;

/** Qualifies independent grants and refusals with controlled persistence and account boundaries. */
@DisplayName("Current action permissions")
class CurrentPermissionsTest {
  private static final UUID ACCOUNT_ID = UUID.fromString("00000000-0000-4000-8000-000000000152");
  private final PermissionStore store = mock(PermissionStore.class);
  private final CurrentPermissions permissions = new CurrentPermissions(store);
  private final AccountAccess accounts = mock(AccountAccess.class);
  private final ActionAuthorization authorization = new ActionAuthorization(accounts, permissions);

  @Test
  @DisplayName("Grants no automatic privilege to an account without assignments")
  void grantsNothingAutomatically() {
    // Given
    when(store.findByAccountId(ACCOUNT_ID)).thenReturn(Set.of());

    // When
    Set<Permission> result = permissions.forAccount(ACCOUNT_ID);

    // Then
    assertThat(result).isEmpty();
  }

  @ParameterizedTest
  @EnumSource(Permission.class)
  @DisplayName("Allows exactly the current action after locking the account")
  void allowsAssignedAction(Permission permission) {
    // Given
    when(accounts.lock(ACCOUNT_ID)).thenReturn(true);
    when(store.findByAccountId(ACCOUNT_ID)).thenReturn(Set.of(permission));

    // When
    ThrowingCallable action = () -> authorization.require(ACCOUNT_ID, permission);

    // Then
    assertThatCode(action).doesNotThrowAnyException();
  }

  @ParameterizedTest
  @EnumSource(
      value = Permission.class,
      names = "MANAGE_MAINTENANCE",
      mode = EnumSource.Mode.EXCLUDE)
  @DisplayName("Maintenance management never authorizes another action")
  void refusesUnassignedAction(Permission otherAction) {
    // Given
    when(accounts.lock(ACCOUNT_ID)).thenReturn(true);
    when(store.findByAccountId(ACCOUNT_ID)).thenReturn(Set.of(Permission.MANAGE_MAINTENANCE));

    // When
    ThrowingCallable action = () -> authorization.require(ACCOUNT_ID, otherAction);

    // Then
    assertThatThrownBy(action).isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @DisplayName("Refuses an absent original account before reading any grant")
  void refusesAbsentAccount() {
    // Given
    when(accounts.lock(ACCOUNT_ID)).thenReturn(false);

    // When
    ThrowingCallable action =
        () -> authorization.require(ACCOUNT_ID, Permission.MANAGE_MAINTENANCE);

    // Then
    assertThatThrownBy(action).isInstanceOf(AccessDeniedException.class);
    verifyNoInteractions(store);
  }

  @ParameterizedTest
  @EnumSource(Permission.class)
  @DisplayName("Allows protected content with its current exact grant")
  void allowsAssignedRead(Permission permission) {
    // Given
    when(store.findByAccountId(ACCOUNT_ID)).thenReturn(Set.of(permission));

    // When
    ThrowingCallable read = () -> permissions.requireForRead(ACCOUNT_ID, permission);

    // Then
    assertThatCode(read).doesNotThrowAnyException();
  }

  @ParameterizedTest
  @EnumSource(
      value = Permission.class,
      names = "MANAGE_MAINTENANCE",
      mode = EnumSource.Mode.EXCLUDE)
  @DisplayName("Refuses protected content when only an unrelated grant is assigned")
  void refusesUnassignedRead(Permission permission) {
    // Given
    when(store.findByAccountId(ACCOUNT_ID)).thenReturn(Set.of(Permission.MANAGE_MAINTENANCE));

    // When
    ThrowingCallable read = () -> permissions.requireForRead(ACCOUNT_ID, permission);

    // Then
    assertThatThrownBy(read).isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @DisplayName("Rechecks a grant withdrawn since the previous protected read")
  void refusesReadAfterWithdrawal() {
    // Given
    when(store.findByAccountId(ACCOUNT_ID))
        .thenReturn(Set.of(Permission.MANAGE_COLLECTION), Set.of());
    permissions.requireForRead(ACCOUNT_ID, Permission.MANAGE_COLLECTION);

    // When
    ThrowingCallable read =
        () -> permissions.requireForRead(ACCOUNT_ID, Permission.MANAGE_COLLECTION);

    // Then
    assertThatThrownBy(read).isInstanceOf(AccessDeniedException.class);
  }
}
