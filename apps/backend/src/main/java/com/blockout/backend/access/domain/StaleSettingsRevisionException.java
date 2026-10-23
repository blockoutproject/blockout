package com.blockout.backend.access.domain;

/**
 * Rejects an obsolete body revision, including stale no-ops, without overwriting current settings.
 */
public class StaleSettingsRevisionException extends RuntimeException {}
