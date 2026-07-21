package com.blockout.clubs.club.infrastructure.storage;

import com.blockout.clubs.club.application.commands.ClubImageCommand;
import com.blockout.clubs.club.application.ports.ClubImageStorage;
import com.blockout.clubs.config.AwsS3Properties;
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
 * S3 adapter for Club logo storage.
 */
@Component
@RequiredArgsConstructor
public class S3ClubImageStorage implements ClubImageStorage {

    private final AwsS3Properties s3Properties;
    private S3Client s3Client;

    /**
     * Builds the provider client from validated application properties.
     */
    @PostConstruct
    void initializeClient() {
        s3Client = S3Client.builder()
            .region(Region.of(s3Properties.getRegion()))
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(
                s3Properties.getCredentials().getAccessKey(),
                s3Properties.getCredentials().getSecretKey())))
            .build();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String uploadClubImage(ClubImageCommand image) {
        String filename = image.filename() == null || image.filename().isBlank()
            ? "club-image"
            : image.filename();
        String key = "clubs/" + UUID.randomUUID() + "-" + filename;
        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(s3Properties.getS3().getBucket())
            .key(key)
            .contentType(image.contentType())
            .build();
        s3Client.putObject(request, RequestBody.fromBytes(image.content()));
        return baseUrl() + key;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void deleteClubImage(String url) {
        if (!url.startsWith(baseUrl())) {
            return;
        }
        String key = url.substring(baseUrl().length());
        s3Client.deleteObject(builder -> builder.bucket(s3Properties.getS3().getBucket()).key(key));
    }

    /**
     * Builds the public URL prefix owned by the configured S3 bucket.
     */
    private String baseUrl() {
        return "https://" + s3Properties.getS3().getBucket() + ".s3."
            + s3Properties.getRegion() + ".amazonaws.com/";
    }
}
