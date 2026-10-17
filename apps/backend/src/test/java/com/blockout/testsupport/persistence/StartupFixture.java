package com.blockout.testsupport.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Validation fixture outside the backend's entity scan, enabled only by its owning test context.
 */
@Entity
@Table(name = "startup_fixture")
public class StartupFixture {
  @Id private Long id;
  private String label;

  /** Allows Hibernate to instantiate the explicitly selected test mapping. */
  protected StartupFixture() {}
}
