package com.blockout.backend.access.infrastructure;

import com.blockout.backend.access.application.PermissionStore;
import com.blockout.backend.access.domain.Permission;
import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** JPA current-grant projection; unknown stored identifiers confer no known action. */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class JpaPermissionStore implements PermissionStore {
  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void erase(UUID accountId) {
    permissions.erase(accountId);
  }

  private final PermissionRepository permissions;

  /** {@inheritDoc} */
  @Override
  public Set<Permission> findByAccountId(UUID accountId) {
    Set<String> assigned = permissions.findByAccountId(accountId);
    return Arrays.stream(Permission.values())
        .filter(permission -> assigned.contains(permission.getValue()))
        .collect(Collectors.toUnmodifiableSet());
  }
}
