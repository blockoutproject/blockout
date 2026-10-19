package com.blockout.backend.sporting.application;

import java.util.List;
import java.util.UUID;
import lombok.Getter;

/** Safe refusal of the complete command; scopes are exposed only to its authorized operator. */
@Getter
public class SportingConflictException extends RuntimeException {
  private final String type;
  private final List<UUID> resourceIds;

  /**
   * Keeps a canonical problem suffix and immutable conflicting sporting identities.
   *
   * @param type owning canonical conflict suffix
   * @param resourceIds authorized pool/team scopes, or an empty list
   */
  public SportingConflictException(String type, List<UUID> resourceIds) {
    super("Sporting command conflicts with current state");
    this.type = type;
    this.resourceIds = List.copyOf(resourceIds);
  }
}
