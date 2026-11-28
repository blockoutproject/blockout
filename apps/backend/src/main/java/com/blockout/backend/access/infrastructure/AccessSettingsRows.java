package com.blockout.backend.access.infrastructure;

/** Scalar cross-row projection, avoiding lazy entity loads outside the statement snapshot. */
record AccessSettingsRows(
    Boolean active,
    String maintenanceMessage,
    String imageUrl,
    String iosMinimumVersion,
    String iosStoreUrl,
    String androidMinimumVersion,
    String androidStoreUrl,
    String updateMessage) {}
