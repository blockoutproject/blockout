package com.blockout.teams.services.clients;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.blockout.teams.config.AwsS3Properties;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class S3StorageClientService {

    private final AwsS3Properties s3Properties;

    private S3Client s3Client;

    @PostConstruct
    public void init() {
        this.s3Client = S3Client.builder()
                .region(Region.of(s3Properties.getRegion()))
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(
                                        s3Properties.getCredentials().getAccessKey(),
                                        s3Properties.getCredentials().getSecretKey())))
                .build();
    }

    public String uploadProfileImage(MultipartFile file, String folder) throws IOException {
        String key = folder + "/" + UUID.randomUUID() + "-" + file.getOriginalFilename();

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(s3Properties.getS3().getBucket())
                .key(key)
                .contentType(file.getContentType())
                .build();

        s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        return "https://" + s3Properties.getS3().getBucket() + ".s3." + s3Properties.getRegion() + ".amazonaws.com/" + key;
    }

    public void deleteObjectByUrl(String url) {
        String baseUrl = "https://" + s3Properties.getS3().getBucket() + ".s3." + s3Properties.getRegion() + ".amazonaws.com/";
        if (!url.startsWith(baseUrl))
            return;

        String key = url.substring(baseUrl.length());
        s3Client.deleteObject(b -> b.bucket(s3Properties.getS3().getBucket()).key(key));
    }
}