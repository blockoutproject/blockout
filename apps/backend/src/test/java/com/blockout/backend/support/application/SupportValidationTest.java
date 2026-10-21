package com.blockout.backend.support.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.generated.mobile.model.SupportRequestKindEnum;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Stream;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;

/** Validates real synthetic image bytes and private temporary ownership without provider calls. */
@DisplayName("Whole support image validation")
class SupportValidationTest {
  @TempDir Path temporaryDirectory;

  @ParameterizedTest
  @ValueSource(ints = {0, 5})
  @DisplayName("Accepts every image and cleans private originals when the snapshot closes")
  void acceptsCompleteInput(int count) throws Exception {
    // Given
    byte[] image = fixture("synthetic.png");
    SupportValidation validation = new SupportValidation(temporaryDirectory);
    List<Path> paths = new ArrayList<>();

    // When
    try (SupportSubmission submission =
        validation.validate(metadata(), Collections.nCopies(count, image))) {
      // Then
      assertThat(submission.requestId()).isNotNull();
      assertThat(submission.issueNumber()).isNull();
      assertThat(submission.images()).hasSize(count);
      for (SupportSubmission.Image accepted : submission.images()) {
        paths.add(accepted.path());
        assertThat(accepted.mediaType()).isEqualTo("image/png");
        assertThat(Files.readAllBytes(accepted.path())).isEqualTo(image);
        assertThat(Files.getPosixFilePermissions(accepted.path()))
            .isEqualTo(PosixFilePermissions.fromString("rw-------"));
      }
    }
    assertThat(paths).allMatch(path -> !Files.exists(path));
  }

  @Test
  @DisplayName("Refuses six images before creating any private file")
  void rejectsSixImages() throws Exception {
    // Given
    SupportValidation validation = new SupportValidation(temporaryDirectory);
    List<byte[]> images = Collections.nCopies(6, fixture("synthetic.png"));

    // When
    ThrowingCallable validate = () -> validation.validate(metadata(), images);

    // Then
    assertThatThrownBy(validate).isInstanceOf(SupportValidation.InvalidSubmission.class);
    assertEmptyTemporaryDirectory();
  }

  @Test
  @DisplayName("Accepts a real image at exactly five MiB without truncation")
  void acceptsExactFileLimit() throws Exception {
    // Given
    byte[] image = Arrays.copyOf(fixture("synthetic.jpg"), 5_242_880);
    SupportValidation validation = new SupportValidation(temporaryDirectory);

    // When
    try (SupportSubmission submission = validation.validate(metadata(), List.of(image))) {
      // Then
      assertThat(Files.size(submission.images().getFirst().path())).isEqualTo(5_242_880);
      assertThat(submission.images().getFirst().mediaType()).isEqualTo("image/jpeg");
    }
  }

  @Test
  @DisplayName("Refuses a file one byte above five MiB before allocation or storage")
  void rejectsOverFileLimit() throws Exception {
    // Given
    byte[] image = Arrays.copyOf(fixture("synthetic.png"), 5_242_881);
    SupportValidation validation = new SupportValidation(temporaryDirectory);

    // When
    ThrowingCallable validate = () -> validation.validate(metadata(), List.of(image));

    // Then
    assertThatThrownBy(validate)
        .isInstanceOf(SupportValidation.InvalidSubmission.class)
        .extracting("reason")
        .isEqualTo(SupportValidation.Reason.CONTENT_TOO_LARGE);
    assertEmptyTemporaryDirectory();
  }

  @ParameterizedTest
  @ValueSource(strings = {"corrupt.png", "disguised.png"})
  @DisplayName("Refuses corrupt or disguised content and leaves no temporary originals")
  void rejectsInvalidImage(String filename) throws Exception {
    // Given
    SupportValidation validation = new SupportValidation(temporaryDirectory);
    List<byte[]> images = List.of(fixture("synthetic.png"), fixture(filename));

    // When
    ThrowingCallable validate = () -> validation.validate(metadata(), images);

    // Then
    assertThatThrownBy(validate)
        .isInstanceOf(SupportValidation.InvalidSubmission.class)
        .extracting("reason")
        .isEqualTo(SupportValidation.Reason.INVALID_IMAGE);
    assertEmptyTemporaryDirectory();
  }

  @Test
  @DisplayName("Accepts the exact approved 64 MiB decoded buffer budget")
  void acceptsExactDecodeBudget() throws Exception {
    // Given
    SupportValidation validation = new SupportValidation(temporaryDirectory);
    byte[] image = fixture("decode-exact.png");

    // When
    try (SupportSubmission submission = validation.validate(metadata(), List.of(image))) {
      // Then
      assertThat(Files.readAllBytes(submission.images().getFirst().path())).isEqualTo(image);
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"decode-over.png", "wide.png"})
  @DisplayName("Rejects excessive decoded buffers before native raster allocation")
  void rejectsDecodeBudget(String filename) throws Exception {
    // Given
    SupportValidation validation = new SupportValidation(temporaryDirectory);
    byte[] image = fixture(filename);

    // When
    ThrowingCallable validate = () -> validation.validate(metadata(), List.of(image));

    // Then
    assertThatThrownBy(validate)
        .isInstanceOf(SupportValidation.InvalidSubmission.class)
        .extracting("reason")
        .isEqualTo(SupportValidation.Reason.INVALID_IMAGE);
    assertEmptyTemporaryDirectory();
  }

  @Test
  @DisplayName("Rejects a real unsupported image format")
  void rejectsGif() throws Exception {
    // Given
    SupportValidation validation = new SupportValidation(temporaryDirectory);
    byte[] image = fixture("synthetic.gif");

    // When
    ThrowingCallable validate = () -> validation.validate(metadata(), List.of(image));

    // Then
    assertThatThrownBy(validate)
        .isInstanceOf(SupportValidation.InvalidSubmission.class)
        .extracting("reason")
        .isEqualTo(SupportValidation.Reason.UNSUPPORTED_IMAGE);
    assertEmptyTemporaryDirectory();
  }

  @Test
  @DisplayName("Rejects an empty selected image rather than dropping it")
  void rejectsEmptyImage() throws Exception {
    // Given
    SupportValidation validation = new SupportValidation(temporaryDirectory);

    // When
    ThrowingCallable validate = () -> validation.validate(metadata(), List.of(new byte[0]));

    // Then
    assertThatThrownBy(validate).isInstanceOf(SupportValidation.InvalidSubmission.class);
    assertEmptyTemporaryDirectory();
  }

  @Test
  @DisplayName("Cleans original files when downstream processing throws")
  void cleansAfterProcessingFailure() throws Exception {
    // Given
    SupportValidation validation = new SupportValidation(temporaryDirectory);
    byte[] image = fixture("synthetic.jpg");

    // When
    ThrowingCallable process =
        () -> {
          try (SupportSubmission submission = validation.validate(metadata(), List.of(image))) {
            assertThat(submission.images()).hasSize(1);
            throw new IllegalStateException("Synthetic processing failure");
          }
        };

    // Then
    assertThatThrownBy(process).isInstanceOf(IllegalStateException.class);
    assertEmptyTemporaryDirectory();
  }

  /** Checks cleanup through the filesystem, not private implementation state. */
  private void assertEmptyTemporaryDirectory() throws Exception {
    try (Stream<Path> files = Files.list(temporaryDirectory)) {
      assertThat(files).isEmpty();
    }
  }

  /**
   * Reads an original synthetic image without sharing mutable bytes between scenarios.
   *
   * @param filename fictional image in this feature's resources
   * @return independent bytes for each scenario
   */
  private static byte[] fixture(String filename) throws Exception {
    return new ClassPathResource("support/" + filename).getContentAsByteArray();
  }

  /** Creates application metadata already accepted by the separately tested generated boundary. */
  private static SupportSubmission.Metadata metadata() {
    return new SupportSubmission.Metadata(
        SupportRequestKindEnum.PROBLEM,
        null,
        "Synthetic request",
        "Fictional description",
        "fixture@example.invalid",
        new SupportSubmission.Context(null, null, null, null, null, null, null, null, null));
  }
}
