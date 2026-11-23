package com.blockout.collector.acquisition.application;

import java.util.function.Supplier;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/** Retains the result of one synchronous read for scopes that share it. */
@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public final class ProviderReadAttempt<T> {
  private final T value;
  private final RuntimeException failure;

  /** Runs the read immediately so later consumers observe the same value or failure. */
  public static <T> ProviderReadAttempt<T> capture(Supplier<T> read) {
    try {
      return new ProviderReadAttempt<>(read.get(), null);
    } catch (RuntimeException failure) {
      return new ProviderReadAttempt<>(null, failure);
    }
  }

  /** Returns the original value or rethrows the original failure without reading again. */
  public T value() {
    if (failure != null) {
      throw failure;
    }
    return value;
  }
}
