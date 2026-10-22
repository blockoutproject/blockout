package com.blockout.backend.access.infrastructure;

/** Scalar cross-row projection, avoiding lazy entity loads outside the statement snapshot. */
record AccessSettingsRows(
    long maintenanceRevision,
    Boolean active,
    String maintenanceMessage,
    String imageUrl,
    long versionsRevision,
    String iosMinimumVersion,
    String iosStoreUrl,
    String androidMinimumVersion,
    String androidStoreUrl,
    String updateMessage) {}
