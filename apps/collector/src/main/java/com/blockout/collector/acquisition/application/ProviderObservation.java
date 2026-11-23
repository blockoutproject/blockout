package com.blockout.collector.acquisition.application;

import java.time.Instant;

/** An interpreted provider read retaining its original response completion time. */
public record ProviderObservation<T>(T observation, Instant observedAt) {}
