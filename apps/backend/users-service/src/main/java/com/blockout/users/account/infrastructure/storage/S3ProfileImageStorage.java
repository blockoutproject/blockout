package com.blockout.users.account.infrastructure.storage;

import com.blockout.users.account.application.ProfileImageStorage;
import com.blockout.users.account.application.UserProfileImageUpload;
import com.blockout.users.config.AwsS3Properties;
import jakarta.annotation.PostConstruct;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/** Implements profile-image storage through the retained AWS S3 configuration and URL shape. */
@Component
@RequiredArgsConstructor
public class S3ProfileImageStorage implements ProfileImageStorage {

    private final AwsS3Properties properties;
    private S3Client client;

    /** Initializes the AWS SDK client from users-service-owned configuration. */
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
    public String upload(UserProfileImageUpload image, String folder) {
        String key = folder + "/" + UUID.randomUUID() + "-" + image.filename();
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(properties.getS3().getBucket())
                .key(key)
                .contentType(image.contentType())
                .build();
        client.putObject(request, RequestBody.fromBytes(image.content()));
        return baseUrl() + key;
    }

    /** {@inheritDoc} */
    @Override
    public void deleteByUrl(String url) {
        String baseUrl = baseUrl();
        if (!url.startsWith(baseUrl)) {
            return;
        }
        String key = url.substring(baseUrl.length());
        client.deleteObject(request -> request.bucket(properties.getS3().getBucket()).key(key));
    }

    /** Preserves the deployed regional public URL convention. */
    private String baseUrl() {
        return "https://" + properties.getS3().getBucket() + ".s3." + properties.getRegion() + ".amazonaws.com/";
    }
}
