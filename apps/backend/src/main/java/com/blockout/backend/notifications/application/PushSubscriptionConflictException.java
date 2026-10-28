package com.blockout.backend.notifications.application;

/**
 * A concurrent association changed the affected lock set or won a native uniqueness/version race.
 */
public class PushSubscriptionConflictException extends RuntimeException {}
