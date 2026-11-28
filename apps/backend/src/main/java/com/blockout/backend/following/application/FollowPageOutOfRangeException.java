package com.blockout.backend.following.application;

/** Refuses a traversal that cannot be represented by native twenty-item JPA paging. */
public class FollowPageOutOfRangeException extends RuntimeException {
  /** Creates an opaque refusal without disclosing the requested traversal. */
  public FollowPageOutOfRangeException() {
    super("Unsupported follow page");
  }
}
