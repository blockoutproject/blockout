package com.blockout.backend.sporting.application.model;

/** Backend-resolved logical precedence; timestamps never participate in ordering. */
public record ObservationOrder(long cycleOrder, long readOrdinal)
    implements Comparable<ObservationOrder> {
  /** {@inheritDoc} */
  @Override
  public int compareTo(ObservationOrder other) {
    int cycle = Long.compare(cycleOrder, other.cycleOrder);
    return cycle == 0 ? Long.compare(readOrdinal, other.readOrdinal) : cycle;
  }
}
