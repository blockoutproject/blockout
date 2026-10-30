package com.blockout.backend.support.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.generated.mobile.model.SupportRequestKindEnum;
import com.blockout.backend.support.application.CreateSupportRequest;
import com.blockout.backend.support.application.SupportCases;
import com.blockout.backend.support.application.SupportSignal;
import com.blockout.backend.support.application.SupportSubmission;
import com.blockout.backend.support.application.SupportUnavailableException;
import com.blockout.backend.support.application.SupportValidation;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.core.io.ClassPathResource;

/**
 * Executes a real controlled Java child, with real validation and finally cleanup; no gh upload.
 */
@DisplayName("Private bounded support attachment process")
@ExtendWith(OutputCaptureExtension.class)
class GitHubAttachmentProcessTest {
  @TempDir Path temporaryDirectory;

  @Test
  @DisplayName(
      "Supplies separate fixed arguments, environment credentials and five private originals")
  void attachesAll(CapturedOutput output) throws Exception {
    // Given
    Path files = Files.createDirectory(temporaryDirectory.resolve("files"));
    GitHubAttachmentProcess process = process("success");

    // When
    useCase(files, process).create(metadata(), Collections.nCopies(5, image()));

    // Then
    List<String> arguments = Files.readAllLines(temporaryDirectory.resolve("arguments"));
    assertThat(arguments.subList(0, 5))
        .containsExactly(
            "issue", "edit", "17", "--repo", "github.com/fictional-org/private-support");
    assertThat(arguments).hasSize(15).doesNotContain("synthetic-token", "--body", "--body-file");
    for (int index = 5; index < arguments.size(); index += 2) {
      assertThat(arguments.get(index)).isEqualTo("--attach");
      assertThat(Path.of(arguments.get(index + 1)).getFileName().toString())
          .matches("support-[0-9]+\\.png");
    }
    assertThat(Files.readString(temporaryDirectory.resolve("private-inputs"))).isEqualTo("true");
    assertThat(Files.readString(temporaryDirectory.resolve("credential-in-environment")))
        .isEqualTo("true");
    assertThat(files).isEmptyDirectory();
    assertThat(output.getAll())
        .doesNotContain(
            "raw-private-provider-output",
            "raw-private-provider-error",
            "synthetic-token",
            "support-");
  }

  @Test
  @DisplayName("Retains controlled partial effects on nonzero exit while refusing completion")
  void refusesPartialUpload() throws Exception {
    // Given
    Path files = Files.createDirectory(temporaryDirectory.resolve("files"));
    SupportSignal signal = mock(SupportSignal.class);
    CreateSupportRequest create = useCase(files, process("partial"), signal);

    // When / Then
    assertThatThrownBy(() -> create.create(metadata(), Collections.nCopies(2, image())))
        .isInstanceOf(SupportUnavailableException.class);
    assertThat(Files.readAllBytes(temporaryDirectory.resolve("first-upload"))).isEqualTo(image());
    assertThat(Files.readAllLines(temporaryDirectory.resolve("invocations"))).hasSize(1);
    assertThat(files).isEmptyDirectory();
    verifyNoInteractions(signal);
  }

  @ParameterizedTest
  @ValueSource(strings = {"timeout", "force"})
  @DisplayName("Stops the timed-out child before finally removing its private files")
  void stopsBeforeCleanup(String mode) throws Exception {
    // Given
    Path files = Files.createDirectory(temporaryDirectory.resolve("files"));
    CreateSupportRequest create = useCase(files, process(mode));
    long started = System.nanoTime();

    // When / Then
    assertThatThrownBy(() -> create.create(metadata(), List.of(image())))
        .isInstanceOf(SupportUnavailableException.class);
    assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(8));
    long pid = Long.parseLong(Files.readString(temporaryDirectory.resolve("pid")));
    assertThat(ProcessHandle.of(pid).map(ProcessHandle::isAlive).orElse(false)).isFalse();
    assertThat(Files.readString(temporaryDirectory.resolve("files-at-termination")))
        .isEqualTo("true");
    assertThat(files).isEmptyDirectory();
  }

  @Test
  @DisplayName("Cleans originals when the configured executable cannot start")
  void cleansStartFailure() throws Exception {
    // Given
    Path files = Files.createDirectory(temporaryDirectory.resolve("files"));
    GitHubAttachmentProcess process =
        new GitHubAttachmentProcess(
            List.of(temporaryDirectory.resolve("absent-gh").toString()),
            destination(),
            Duration.ofSeconds(2));

    // When / Then
    assertThatThrownBy(() -> useCase(files, process).create(metadata(), List.of(image())))
        .isInstanceOf(SupportUnavailableException.class);
    assertThat(files).isEmptyDirectory();
  }

  @Test
  @DisplayName("An interrupted wait stops the child before cleanup and restores interrupt status")
  void stopsInterruptedChild() throws Exception {
    // Given
    Path files = Files.createDirectory(temporaryDirectory.resolve("files"));
    byte[] image = image();
    CreateSupportRequest create = useCase(files, process("timeout"));
    AtomicReference<SupportUnavailableException> observed = new AtomicReference<>();
    AtomicBoolean interrupted = new AtomicBoolean();
    Thread worker =
        new Thread(
            () -> {
              try {
                create.create(metadata(), List.of(image));
              } catch (SupportUnavailableException failure) {
                observed.set(failure);
              } finally {
                interrupted.set(Thread.currentThread().isInterrupted());
              }
            });
    worker.start();

    try {
      await()
          .atMost(Duration.ofSeconds(5))
          .until(() -> Files.exists(temporaryDirectory.resolve("ready")));

      // When
      worker.interrupt();
      worker.join(5_000);

      // Then
      assertThat(worker.isAlive()).isFalse();
      assertThat(observed.get()).isNotNull();
      assertThat(observed.get().getReason())
          .isEqualTo(SupportUnavailableException.Reason.INTERRUPTED);
      assertThat(interrupted.get()).isTrue();
      assertThat(Files.readString(temporaryDirectory.resolve("files-at-termination")))
          .isEqualTo("true");
      assertThat(files).isEmptyDirectory();
    } finally {
      worker.interrupt();
      worker.join(7_000);
    }
  }

  /**
   * Replaces only the executable with this JVM's local controlled child.
   *
   * @param mode explicit success, partial, timeout or forced-termination scenario
   * @return real process adapter using the controlled child
   */
  private GitHubAttachmentProcess process(String mode) {
    return new GitHubAttachmentProcess(
        List.of(
            Path.of(System.getProperty("java.home"), "bin", "java").toString(),
            "-cp",
            System.getProperty("java.class.path"),
            Child.class.getName(),
            temporaryDirectory.toString(),
            mode),
        destination(),
        Duration.ofSeconds(2));
  }

  /**
   * Keeps the production whole-input and cleanup owners around the real process adapter.
   *
   * @param files this test's transient original directory
   * @param process actual executable adapter
   * @return application owner with only issue creation and signaling replaced
   */
  private CreateSupportRequest useCase(Path files, GitHubAttachmentProcess process) {
    return useCase(files, process, mock(SupportSignal.class));
  }

  /**
   * Supplies controlled external issue creation without hiding any validation or file ownership.
   *
   * @param files this test's transient original directory
   * @param process actual executable adapter
   * @param signal scenario-owned secondary boundary
   * @return real complete-send owner
   */
  private CreateSupportRequest useCase(
      Path files, GitHubAttachmentProcess process, SupportSignal signal) {
    SupportCases cases = mock(SupportCases.class);
    when(cases.create(any())).thenReturn(17L);
    return new CreateSupportRequest(new SupportValidation(files), cases, process, signal);
  }

  /** Fictional fixed credentials/destination; the adapter never receives a caller-selected repo. */
  private static SupportProperties.Destination destination() {
    return new SupportProperties.Destination(
        "fictional-org/private-support",
        "incomplete",
        "complete",
        "synthetic-token",
        "https://discord.com/api/webhooks/1/synthetic");
  }

  /** Already canonically validated fictional metadata for process orchestration. */
  private static SupportSubmission.Metadata metadata() {
    return new SupportSubmission.Metadata(
        SupportRequestKindEnum.PROBLEM,
        null,
        "Fiction",
        "Description",
        "fiction@example.invalid",
        new SupportSubmission.Context(null, null, null, null, null, null, null, null, null));
  }

  /** Reuses the owning feature's synthetic compressed original. */
  private static byte[] image() throws Exception {
    return new ClassPathResource("support/synthetic.png").getContentAsByteArray();
  }

  /**
   * Local executable fixture whose on-disk evidence models partial effects independently of exit.
   */
  public static final class Child {
    /**
     * Records invocation/environment/file properties, then follows the explicit test scenario.
     *
     * @param args evidence directory, mode and actual production CLI argument vector
     * @throws Exception when local fixture I/O fails
     */
    public static void main(String[] args) throws Exception {
      Path evidence = Path.of(args[0]);
      String mode = args[1];
      List<String> arguments = List.of(args).subList(2, args.length);
      Files.writeString(evidence.resolve("pid"), Long.toString(ProcessHandle.current().pid()));
      Files.write(evidence.resolve("arguments"), arguments);
      Files.writeString(
          evidence.resolve("invocations"),
          "invoked\n",
          StandardOpenOption.CREATE,
          StandardOpenOption.APPEND);
      Files.writeString(
          evidence.resolve("credential-in-environment"),
          Boolean.toString("synthetic-token".equals(System.getenv("GH_TOKEN"))));
      List<Path> images = new ArrayList<>();
      for (int index = 5; index < arguments.size(); index += 2)
        images.add(Path.of(arguments.get(index + 1)));
      boolean privateInputs = true;
      for (Path image : images)
        privateInputs &=
            Files.getPosixFilePermissions(image)
                .equals(PosixFilePermissions.fromString("rw-------"));
      Files.writeString(evidence.resolve("private-inputs"), Boolean.toString(privateInputs));
      System.out.print("raw-private-provider-output".repeat(10_000));
      System.err.print("raw-private-provider-error".repeat(10_000));
      if (mode.equals("partial")) {
        Files.copy(images.getFirst(), evidence.resolve("first-upload"));
        System.exit(1);
      }
      if (mode.equals("timeout") || mode.equals("force")) {
        Runtime.getRuntime()
            .addShutdownHook(
                new Thread(
                    () -> {
                      try {
                        Files.writeString(
                            evidence.resolve("files-at-termination"),
                            Boolean.toString(images.stream().allMatch(Files::exists)));
                        if (mode.equals("force")) new CountDownLatch(1).await();
                      } catch (Exception failure) {
                        throw new IllegalStateException(failure);
                      }
                    }));
        Files.writeString(evidence.resolve("ready"), "ready");
        new CountDownLatch(1).await();
      }
    }
  }
}
