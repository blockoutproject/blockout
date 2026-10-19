package com.blockout.backend.sporting.application.model;

/** Current and last completed calendar order; no stored request or replay checkpoint. */
public record CalendarState(ObservationOrder current, ObservationOrder completed) {}
