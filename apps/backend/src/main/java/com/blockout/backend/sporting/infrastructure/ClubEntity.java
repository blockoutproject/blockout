package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/** Persistent provider-qualified organization; an unknown page label remains null. */
@Entity
@Table(name = "sporting_club")
public class ClubEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CollectionProviderEnum provider;

  @Column(nullable = false)
  private String reference;

  private String sourceName;

  @ElementCollection
  @CollectionTable(name = "sporting_club_alias", joinColumns = @JoinColumn(name = "club_id"))
  private Set<VerifiedName> aliases = new HashSet<>();

  /** Allows Hibernate to instantiate the mapped club. */
  protected ClubEntity() {}

  /**
   * Establishes the supplied club state without generating another owner model.
   *
   * @param provider designated native authority
   * @param reference exact native reference, preserving its original spelling
   * @param sourceName available original source label, or null when unknown
   */
  public ClubEntity(CollectionProviderEnum provider, String reference, String sourceName) {
    this.provider = provider;
    this.reference = reference;
    this.sourceName = sourceName;
  }

  public UUID getId() {
    return id;
  }

  public CollectionProviderEnum getProvider() {
    return provider;
  }

  public String getReference() {
    return reference;
  }

  public String getSourceName() {
    return sourceName;
  }
}
