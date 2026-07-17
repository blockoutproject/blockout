package com.blockout.users.account.infrastructure.storage;

import static org.assertj.core.api.Assertions.assertThatCode;

import com.blockout.users.config.AwsS3Properties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies foreign profile URLs remain outside users-service storage ownership. */
@DisplayName("S3 profile image storage")
class S3ProfileImageStorageUnitTest {

    /** Proves a foreign URL is ignored before an SDK delete can occur. */
    @Test
    @DisplayName("ignores a foreign object URL")
    void ignoresForeignObjectUrl() {
        AwsS3Properties properties = new AwsS3Properties();
        properties.setRegion("eu-west-3");
        properties.getS3().setBucket("blockout-users");
        S3ProfileImageStorage storage = new S3ProfileImageStorage(properties);

        assertThatCode(() -> storage.deleteByUrl("https://identity.example/picture.png"))
                .doesNotThrowAnyException();
    }
}
