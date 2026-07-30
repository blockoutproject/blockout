package com.blockout.mobilegateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MobileGatewayApplication {

  public static void main(String[] args) {
    SpringApplication.run(MobileGatewayApplication.class, args);
  }
}
