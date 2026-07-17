package com.blockout.reports.report.infrastructure.storage;

import com.blockout.reports.config.AwsS3Properties;
import com.blockout.reports.report.application.ReportAttachment;
import com.blockout.reports.report.application.ReportAttachmentStorage;
import jakarta.annotation.PostConstruct;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/** Adapts validated report attachments to the retained public S3 object convention. */
@Component
@RequiredArgsConstructor
public class S3ReportAttachmentStorage implements ReportAttachmentStorage {

    private final AwsS3Properties properties;
    private S3Client client;

    /** Initializes the retained static-credential synchronous AWS client. */
    @PostConstruct
    public void initialize() {
        client = S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(
                        properties.getCredentials().getAccessKey(),
                        properties.getCredentials().getSecretKey())))
                .build();
    }

    /** {@inheritDoc} */
    @Override
    public String upload(ReportAttachment attachment, String reportKey, int index) {
        String key = String.format("reports/%s/%d.%s", reportKey, index, resolveExtension(attachment));
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(properties.getS3().getBucket())
                .key(key)
                .contentType(attachment.contentType())
                .build();
        client.putObject(request, RequestBody.fromBytes(attachment.content()));
        return publicUrl(key);
    }

    /** Preserves the current content-type, filename, and binary fallbacks. */
    private String resolveExtension(ReportAttachment attachment) {
        String contentType = attachment.contentType();
        if (contentType != null) {
            switch (contentType.toLowerCase(Locale.ROOT)) {
                case "image/jpeg", "image/jpg" -> {
                    return "jpg";
                }
                case "image/png" -> {
                    return "png";
                }
                case "image/webp" -> {
                    return "webp";
                }
                case "image/gif" -> {
                    return "gif";
                }
                default -> {
                    // Fall through to the retained filename behavior.
                }
            }
        }
        String filename = attachment.filename();
        if (filename != null) {
            int dot = filename.lastIndexOf('.');
            if (dot >= 0 && dot < filename.length() - 1) {
                return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
            }
        }
        return "bin";
    }

    /** Builds the deployed regional public URL. */
    private String publicUrl(String key) {
        return "https://" + properties.getS3().getBucket() + ".s3." + properties.getRegion()
                + ".amazonaws.com/" + key;
    }
}
