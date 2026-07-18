package com.blockout.reports.report.infrastructure.storage;

import com.blockout.reports.config.AwsS3Properties;
import com.blockout.reports.report.application.ReportAttachmentStorage;
import com.blockout.reports.report.application.ReportSubmissionPlan;
import jakarta.annotation.PostConstruct;
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
    public String upload(ReportSubmissionPlan.AttachmentUpload upload) {
        String key = String.format(
                "reports/%s/%d.%s",
                upload.reportKey(), upload.index(), extension(upload.attachment().contentType()));
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(properties.getS3().getBucket())
                .key(key)
                .contentType(upload.attachment().contentType())
                .build();
        client.putObject(request, RequestBody.fromBytes(upload.attachment().content()));
        return publicUrl(key);
    }

    /** Maps the two application-validated media types to their retained object suffixes. */
    private String extension(String contentType) {
        return "image/jpeg".equals(contentType) ? "jpg" : "png";
    }

    /** Builds the deployed regional public URL. */
    private String publicUrl(String key) {
        return "https://" + properties.getS3().getBucket() + ".s3." + properties.getRegion()
                + ".amazonaws.com/" + key;
    }
}
