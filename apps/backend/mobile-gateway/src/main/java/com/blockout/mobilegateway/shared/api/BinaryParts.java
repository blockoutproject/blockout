package com.blockout.mobilegateway.shared.api;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Objects;
import org.springframework.web.multipart.MultipartFile;

/** Maps Spring multipart values at the inbound adapter edge. */
public final class BinaryParts {

    private BinaryParts() {
    }

    public static BinaryPart from(MultipartFile file) {
        if (file == null) {
            return null;
        }
        try {
            return new BinaryPart(file.getOriginalFilename(), file.getContentType(), file.getBytes());
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to read multipart content", exception);
        }
    }

    public static List<BinaryPart> from(List<MultipartFile> files) {
        return files == null
                ? List.of()
                : files.stream().filter(Objects::nonNull).map(BinaryParts::from).toList();
    }
}
