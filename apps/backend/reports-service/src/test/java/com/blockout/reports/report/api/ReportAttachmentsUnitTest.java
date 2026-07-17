package com.blockout.reports.report.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

/** Verifies immediate multipart-to-application attachment mapping. */
@DisplayName("Report attachments")
class ReportAttachmentsUnitTest {

    /** Proves transport metadata and bytes are retained without leaking MultipartFile. */
    @Test
    @DisplayName("maps multipart metadata and content")
    void mapsMultipartMetadataAndContent() throws Exception {
        var attachments = ReportAttachments.from(List.of(
                new MockMultipartFile("images", "capture.png", "image/png", new byte[] {1, 2})));

        assertThat(attachments).hasSize(1);
        assertThat(attachments.getFirst().filename()).isEqualTo("capture.png");
        assertThat(attachments.getFirst().contentType()).isEqualTo("image/png");
        assertThat(attachments.getFirst().size()).isEqualTo(2);
        assertThat(attachments.getFirst().content()).containsExactly(1, 2);
    }

    /** Proves a missing optional multipart list remains an empty application collection. */
    @Test
    @DisplayName("maps a missing attachment list to empty")
    void mapsMissingAttachmentListToEmpty() throws Exception {
        assertThat(ReportAttachments.from(null)).isEmpty();
    }
}
