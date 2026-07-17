package com.blockout.config.division.infrastructure.storage;

import com.blockout.config.config.AwsS3Properties;
import com.blockout.config.division.application.DivisionLogoStorage;
import com.blockout.config.division.application.DivisionLogoUpload;
import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Component
@RequiredArgsConstructor
public class S3DivisionLogoStorage implements DivisionLogoStorage {

    private final AwsS3Properties properties;
    private S3Client client;

    @PostConstruct
    void initialize() {
        client = S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(
                        properties.getCredentials().getAccessKey(),
                        properties.getCredentials().getSecretKey())))
                .build();
    }

    @Override
    public String upload(DivisionLogoUpload image) {
        String key = "divisions/" + UUID.randomUUID() + "-" + image.fileName();
        byte[] content = image.content();
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(properties.getS3().getBucket())
                .key(key)
                .contentType(image.contentType())
                .build();
        client.putObject(request, RequestBody.fromInputStream(new ByteArrayInputStream(content), content.length));
        return baseUrl() + key;
    }

    @Override
    public void delete(String url) {
        if (!url.startsWith(baseUrl())) {
            return;
        }
        client.deleteObject(builder -> builder.bucket(properties.getS3().getBucket())
                .key(url.substring(baseUrl().length())));
    }

    private String baseUrl() {
        return "https://" + properties.getS3().getBucket() + ".s3." + properties.getRegion() + ".amazonaws.com/";
    }
}
