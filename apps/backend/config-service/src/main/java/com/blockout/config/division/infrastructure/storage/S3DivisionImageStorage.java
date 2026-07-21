package com.blockout.config.division.infrastructure.storage;

import com.blockout.config.config.AwsS3Properties;
import com.blockout.config.division.application.commands.DivisionImageCommand;
import com.blockout.config.division.application.ports.DivisionImageStorage;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

/**
 * S3 adapter for managed Division images.
 */
@Component
@RequiredArgsConstructor
public class S3DivisionImageStorage implements DivisionImageStorage {

    private final AwsS3Properties properties;
    private S3Client s3Client;

    /**
     * Builds the S3 client from application configuration.
     */
    @PostConstruct
    public void initialize() {
        s3Client = S3Client.builder()
            .region(Region.of(properties.getRegion()))
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(
                properties.getCredentials().getAccessKey(), properties.getCredentials().getSecretKey())))
            .build();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String uploadDivisionImage(DivisionImageCommand image) {
        String key = "divisions/" + UUID.randomUUID() + "-" + image.fileName();
        PutObjectRequest request = PutObjectRequest.builder().bucket(properties.getS3().getBucket())
            .key(key).contentType(image.contentType()).build();
        s3Client.putObject(request, RequestBody.fromBytes(image.content()));
        return baseUrl() + key;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void deleteDivisionImage(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith(baseUrl())) return;
        s3Client.deleteObject(builder -> builder.bucket(properties.getS3().getBucket())
            .key(imageUrl.substring(baseUrl().length())));
    }

    /**
     * Returns the public base URL for objects managed by this adapter.
     */
    private String baseUrl() {
        return "https://" + properties.getS3().getBucket() + ".s3." + properties.getRegion() + ".amazonaws.com/";
    }
}
