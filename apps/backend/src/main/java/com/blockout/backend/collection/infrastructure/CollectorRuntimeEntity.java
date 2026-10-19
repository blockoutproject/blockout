package com.blockout.backend.collection.infrastructure;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Current collector runtime persistence; application services own changes and transactions. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "collector_runtime")
class CollectorRuntimeEntity {
  @Id private int id;
  @Version private long revision;
  @Setter private UUID incarnationId;
}
