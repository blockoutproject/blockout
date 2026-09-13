package com.blockout.backend.identity.user.application;

/** Identity lookup failures; the API boundary owns their translation into transport codes. */
public enum IdentityFailureReason {
  IDENTITY_PROVIDER_UNAVAILABLE,
  IDENTITY_CONFIGURATION_ERROR
}
