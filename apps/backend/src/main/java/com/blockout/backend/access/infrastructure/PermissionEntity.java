package com.blockout.backend.access.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Read mapping of owner-assigned grants; PostgreSQL owns uniqueness and account cascade deletion.
 */
@Entity
@Table(name = "account_permission")
@IdClass(PermissionEntity.Key.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PermissionEntity {
  @Id
  @Column(nullable = false, updatable = false)
  private UUID accountId;

  @Id
  @Column(nullable = false, updatable = false)
  private String permission;

  /**
   * Native composite identity, without an unrelated surrogate identifier.
   *
   * @param accountId original business account lifecycle
   * @param permission stable action identifier stored by the owner
   */
  public record Key(UUID accountId, String permission) {}
}
