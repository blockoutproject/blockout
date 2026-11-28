package com.blockout.backend.support.application;

/** Secondary operational signal, deliberately unable to receive any submitted content. */
public interface SupportSignal {
  /** Attempts one bounded generic signal after complete receipt; failures never escape to users. */
  void accepted();
}
