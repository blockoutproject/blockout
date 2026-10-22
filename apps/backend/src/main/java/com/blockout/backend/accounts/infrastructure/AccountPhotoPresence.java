package com.blockout.backend.accounts.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

/**
 * Query-only photo mapping for the JPQL presence predicate. Identity reads/locks retain their
 * lightweight AccountEntity; no photo bytes are selected or materialized by the presence query.
 */
@Entity
@Table(name = "account")
@Immutable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class AccountPhotoPresence {
  @Id private UUID id;

  @Column(name = "photo_bytes")
  private byte[] bytes;
}
