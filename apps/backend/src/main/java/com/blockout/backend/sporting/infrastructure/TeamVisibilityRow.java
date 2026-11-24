package com.blockout.backend.sporting.infrastructure;

/** A team needs an active division for any of its current participations to be viewable. */
record TeamVisibilityRow(boolean divisionActive, boolean hasViewableParticipation) {}
