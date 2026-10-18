package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Minimal administered division identity and explicit state, without presentation commands. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "sporting_division")
public class DivisionEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private boolean active;

  @ElementCollection
  @CollectionTable(name = "sporting_division_term", joinColumns = @JoinColumn(name = "division_id"))
  @Column(name = "term", nullable = false)
  private Set<String> searchTerms = new HashSet<>();

  /**
   * Establishes the supplied division state without generating another owner model.
   *
   * @param name current administered name
   * @param active explicit division activity
   */
  public DivisionEntity(String name, boolean active) {
    this.name = name;
    this.active = active;
  }
}
