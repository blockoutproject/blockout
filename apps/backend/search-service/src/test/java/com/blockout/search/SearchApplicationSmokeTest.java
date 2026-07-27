package com.blockout.search;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(
    properties = {
      "elasticsearch.host=127.0.0.1:1",
      "elasticsearch.username=unused",
      "elasticsearch.password=unused",
      "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://127.0.0.1:1"
    })
class SearchApplicationSmokeTest {

  @Test
  void contextLoads() {}
}
