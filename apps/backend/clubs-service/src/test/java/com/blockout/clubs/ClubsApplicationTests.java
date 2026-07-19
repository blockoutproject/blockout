package com.blockout.clubs;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"clubs.geocoding.initial-delay=86400000",
		"spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost/unused"
})
class ClubsApplicationTests {

	@Test
	void contextLoads() {
	}

}
