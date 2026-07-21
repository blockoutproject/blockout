package com.blockout.users.user.infrastructure.storage;

import com.blockout.users.config.AwsS3Properties;
import com.blockout.users.user.application.commands.UserImageCommand;
import com.blockout.users.user.application.ports.UserImageStorage;
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

@Component
@RequiredArgsConstructor
public class S3UserImageStorage implements UserImageStorage {

    private final AwsS3Properties properties;
    private S3Client s3Client;

    @PostConstruct
    void initialize() {
        s3Client = S3Client.builder()
            .region(Region.of(properties.getRegion()))
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(
                properties.getCredentials().getAccessKey(), properties.getCredentials().getSecretKey())))
            .build();
    }

    @Override
    public String uploadProfileImage(UserImageCommand image) {
        String key = "users/" + UUID.randomUUID() + "-" + image.fileName();
        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(properties.getS3().getBucket())
            .key(key)
            .contentType(image.contentType())
            .build();
        s3Client.putObject(request, RequestBody.fromBytes(image.content()));
        return baseUrl() + key;
    }

    @Override
    public void deleteProfileImage(String imageUrl) {
        if (!imageUrl.startsWith(baseUrl())) return;
        s3Client.deleteObject(builder -> builder
            .bucket(properties.getS3().getBucket())
            .key(imageUrl.substring(baseUrl().length())));
    }

    private String baseUrl() {
        return "https://" + properties.getS3().getBucket() + ".s3." + properties.getRegion() + ".amazonaws.com/";
    }
}
