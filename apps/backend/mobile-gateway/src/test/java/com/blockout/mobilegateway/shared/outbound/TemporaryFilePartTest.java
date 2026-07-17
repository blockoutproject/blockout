package com.blockout.mobilegateway.shared.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import org.junit.jupiter.api.Test;

class TemporaryFilePartTest {

    @Test
    void materializesGeneratedClientFileAndDeletesItAfterTheCall() {
        TemporaryFilePart temporary = TemporaryFilePart.create(
                new BinaryPart("logo.png", "image/png", new byte[] {1, 2, 3}));
        var file = temporary.file();

        try {
            assertThat(file).exists().hasExtension("png");
        } finally {
            temporary.close();
        }

        assertThat(file).doesNotExist();
    }

    @Test
    void rejectsPathLikeOrUnboundedFilenameSuffixes() {
        TemporaryFilePart temporary = TemporaryFilePart.create(
                new BinaryPart("logo.../escape.reallylongextension", "image/png", new byte[] {1}));
        var file = temporary.file();

        try {
            assertThat(file).exists().hasExtension("bin");
        } finally {
            temporary.close();
        }
    }
}
