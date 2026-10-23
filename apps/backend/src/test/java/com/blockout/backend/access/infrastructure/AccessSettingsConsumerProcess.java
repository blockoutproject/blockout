package com.blockout.backend.access.infrastructure;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.TimeUnit;

/** Owns the bounded lifetime of the npm/Jest consumer launched by settings qualification. */
final class AccessSettingsConsumerProcess {
  /** Prevents instances of this test-local process owner. */
  private AccessSettingsConsumerProcess() {}

  /**
   * Waits for the consumer and stops its remaining subprocesses before returning or propagating
   * interruption. The native descendant snapshot is captured before stopping npm; children get five
   * seconds to exit while their parent can still reap them, followed by five seconds for npm
   * itself. Cleanup waits preserve interruption and cannot leave this test waiting indefinitely.
   *
   * @param consumer npm process started by the caller
   * @param timeout maximum time allowed for consumer assertions
   * @return whether the consumer finished within the supplied timeout
   * @throws InterruptedException when the caller is interrupted while awaiting the consumer
   * @throws CompletionException when a process does not exit within its cleanup deadline
   */
  static boolean waitFor(Process consumer, Duration timeout) throws InterruptedException {
    try {
      return consumer.waitFor(timeout);
    } finally {
      try {
        List<ProcessHandle> children = consumer.descendants().toList();
        children.forEach(ProcessHandle::destroyForcibly);
        CompletableFuture.allOf(
                children.stream().map(ProcessHandle::onExit).toArray(CompletableFuture[]::new))
            .orTimeout(5, TimeUnit.SECONDS)
            .join();
      } finally {
        consumer.destroyForcibly();
        consumer.onExit().orTimeout(5, TimeUnit.SECONDS).join();
      }
    }
  }
}
