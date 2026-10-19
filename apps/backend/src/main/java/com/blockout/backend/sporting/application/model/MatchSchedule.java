package com.blockout.backend.sporting.application.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

/** Current accepted schedule and entry reference, with independent provenance for each group. */
@Builder(toBuilder = true)
public record MatchSchedule(
    UUID id,
    Long acceptedCycleOrder,
    Long acceptedReadOrdinal,
    LocalDate localDate,
    String localTime,
    String timeZone,
    Instant reliableStart,
    String detailUrl,
    Instant scheduleObservedAt,
    Instant schedulePublishedAt,
    Instant referenceObservedAt,
    Instant referencePublishedAt) {}
