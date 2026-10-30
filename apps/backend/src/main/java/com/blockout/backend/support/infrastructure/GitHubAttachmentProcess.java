package com.blockout.backend.support.infrastructure;

import com.blockout.backend.support.application.SupportAttachments;
import com.blockout.backend.support.application.SupportSubmission;
import com.blockout.backend.support.application.SupportUnavailableException;
import com.blockout.backend.support.application.SupportUnavailableException.Reason;
import com.blockout.backend.support.application.SupportUnavailableException.Stage;
import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** One bounded official CLI invocation; stdout/stderr are discarded, never parsed or logged. */
public final class GitHubAttachmentProcess implements SupportAttachments {
  private final List<String> executable;
  private final SupportProperties.Destination destination;
  private final Duration timeout;

  /**
   * Uses the packaged official binary; construction performs no upload or capability probe.
   *
   * @param properties server-owned destination and process deadline
   */
  public GitHubAttachmentProcess(SupportProperties properties) {
    this(List.of("gh"), properties.destination(), properties.processTimeout());
  }

  /**
   * Allows the process boundary to be exercised by a controlled local executable.
   *
   * @param executable fixed command prefix, never derived from submitted input
   * @param destination server-owned private repository and credential
   * @param timeout positive completion wait
   */
  GitHubAttachmentProcess(
      List<String> executable, SupportProperties.Destination destination, Duration timeout) {
    this.executable = List.copyOf(executable);
    this.destination = destination;
    this.timeout = timeout;
  }

  /** {@inheritDoc} */
  @Override
  public void attach(long issueNumber, List<SupportSubmission.Image> images) {
    if (destination == null)
      throw new SupportUnavailableException(Stage.CONFIGURATION, Reason.UNCONFIGURED);
    List<String> arguments = new ArrayList<>(executable);
    arguments.addAll(
        List.of(
            "issue",
            "edit",
            Long.toString(issueNumber),
            "--repo",
            "github.com/" + destination.repository()));
    for (SupportSubmission.Image image : images)
      arguments.addAll(List.of("--attach", image.path().toString()));
    ProcessBuilder builder =
        new ProcessBuilder(arguments)
            .redirectOutput(ProcessBuilder.Redirect.DISCARD)
            .redirectError(ProcessBuilder.Redirect.DISCARD);
    builder.environment().put("GH_TOKEN", destination.githubToken());
    builder.environment().put("GH_HOST", "github.com");
    builder.environment().put("GH_PROMPT_DISABLED", "1");
    Process child;
    try {
      child = builder.start();
    } catch (IOException failure) {
      throw new SupportUnavailableException(Stage.ATTACH, Reason.IO, failure);
    }
    try {
      child.getOutputStream().close();
      if (!child.waitFor(timeout)) {
        throw new SupportUnavailableException(
            Stage.ATTACH, stop(child) ? Reason.TIMEOUT : Reason.TERMINATION_FAILED);
      }
      if (child.exitValue() != 0)
        throw new SupportUnavailableException(Stage.ATTACH, Reason.PROCESS_FAILED);
    } catch (IOException failure) {
      throw new SupportUnavailableException(
          Stage.ATTACH, stop(child) ? Reason.IO : Reason.TERMINATION_FAILED, failure);
    } catch (InterruptedException failure) {
      boolean stopped = stop(child);
      Thread.currentThread().interrupt();
      throw new SupportUnavailableException(
          Stage.ATTACH, stopped ? Reason.INTERRUPTED : Reason.TERMINATION_FAILED, failure);
    }
  }

  /**
   * Terminates the owned child, allowing one second for normal shutdown then five for forced exit.
   * If termination cannot be established, the caller retains files rather than deleting live input.
   *
   * @param child only this invocation's child
   * @return whether it has stopped and its temporary input can be removed
   */
  private static boolean stop(Process child) {
    child.destroy();
    try {
      if (child.waitFor(Duration.ofSeconds(1))) return true;
      child.destroyForcibly();
      return child.waitFor(Duration.ofSeconds(5));
    } catch (InterruptedException interrupted) {
      child.destroyForcibly();
      Thread.currentThread().interrupt();
      return !child.isAlive();
    }
  }
}
