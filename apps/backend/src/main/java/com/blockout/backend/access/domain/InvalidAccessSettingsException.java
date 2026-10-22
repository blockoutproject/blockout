package com.blockout.backend.access.domain;

/**
 * Refuses an invalid complete settings result or an unsafe revision advance without command
 * effects.
 */
public class InvalidAccessSettingsException extends RuntimeException {}
