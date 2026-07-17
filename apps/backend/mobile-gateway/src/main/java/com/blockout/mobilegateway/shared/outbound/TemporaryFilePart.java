package com.blockout.mobilegateway.shared.outbound;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Bounded bridge for generated Java clients whose multipart signature requires {@link File}. */
public final class TemporaryFilePart implements AutoCloseable {

    private static final Logger LOGGER = LoggerFactory.getLogger(TemporaryFilePart.class);
    private final Path path;

    private TemporaryFilePart(Path path) {
        this.path = path;
    }

    public static TemporaryFilePart create(BinaryPart part) {
        if (part == null) {
            return null;
        }
        try {
            String suffix = suffix(part.filename());
            Path path = Files.createTempFile("blockout-contract-", suffix);
            Files.write(path, part.content());
            return new TemporaryFilePart(path);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to materialize generated-client multipart content", exception);
        }
    }

    public File file() {
        return path.toFile();
    }

    @Override
    public void close() {
        try {
            Files.deleteIfExists(path);
        } catch (IOException exception) {
            path.toFile().deleteOnExit();
            LOGGER.warn("Failed to delete generated-client multipart content immediately", exception);
        }
    }

    private static String suffix(String filename) {
        if (filename == null) {
            return ".bin";
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0) {
            return ".bin";
        }
        String candidate = filename.substring(dot);
        return candidate.matches("\\.[A-Za-z0-9]{1,10}") ? candidate : ".bin";
    }
}
