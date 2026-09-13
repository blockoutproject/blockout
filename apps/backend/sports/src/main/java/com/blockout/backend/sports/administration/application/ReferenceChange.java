package com.blockout.backend.sports.administration.application;

/** Expected mutation outcomes; storage failures remain Spring data-access exceptions. */
public enum ReferenceChange {
  APPLIED,
  MISSING,
  CONFLICT,
  INVALID
}
