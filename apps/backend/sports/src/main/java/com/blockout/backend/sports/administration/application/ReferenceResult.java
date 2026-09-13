package com.blockout.backend.sports.administration.application;

/** Mutation result with a value only when the requested change was applied. */
public record ReferenceResult<T>(ReferenceChange outcome, T value) {}
