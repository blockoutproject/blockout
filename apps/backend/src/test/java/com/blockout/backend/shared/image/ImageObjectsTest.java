package com.blockout.backend.shared.image;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.blockout.backend.shared.image.ImageObjects.Category;
import com.blockout.backend.testsupport.InMemoryS3;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronizationUtils;

@DisplayName("Application image replacement completion")
class ImageObjectsTest {
  @Test
  @DisplayName("Reports an unknown SQL outcome once and leaves both candidate objects readable")
  void preservesBothObjectsWhenCompletionIsUnknown() {
    // Given
    InMemoryS3 s3 = new InMemoryS3();
    ImageObjects images =
        new ImageObjects(s3, new ImageStorageProperties("blockout-test-images", "eu-west-3"));
    byte[] original = {1};
    byte[] replacement = {2};
    String previousKey = s3.putImage(original, "image/png");
    Logger logger = (Logger) LoggerFactory.getLogger(ImageObjects.class);
    ListAppender<ILoggingEvent> events = new ListAppender<>();
    events.start();
    logger.addAppender(events);
    TransactionSynchronizationManager.initSynchronization();

    String replacementKey;
    try {
      // When
      replacementKey = images.replace(Category.PROFILES, previousKey, replacement, "image/png");
      TransactionSynchronizationUtils.triggerAfterCompletion(
          TransactionSynchronization.STATUS_UNKNOWN);
    } finally {
      TransactionSynchronizationManager.clearSynchronization();
      logger.detachAppender(events);
      events.stop();
    }

    // Then
    assertThat(images.read(previousKey)).isEqualTo(original);
    assertThat(images.read(replacementKey)).isEqualTo(replacement);
    assertThat(events.list)
        .singleElement()
        .satisfies(
            event ->
                assertThat(event.getKeyValuePairs())
                    .anySatisfy(
                        pair -> {
                          assertThat(pair.key).isEqualTo("reason");
                          assertThat(pair.value).isEqualTo("transaction_outcome_unknown");
                        }));
  }
}
