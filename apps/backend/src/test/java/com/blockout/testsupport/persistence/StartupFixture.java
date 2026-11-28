package com.blockout.testsupport.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Validation fixture outside the backend's entity scan, enabled only by its owning test context.
 */
@Entity
@Table(name = "startup_fixture")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StartupFixture {
  @Id private Long id;
  private String label;
}
