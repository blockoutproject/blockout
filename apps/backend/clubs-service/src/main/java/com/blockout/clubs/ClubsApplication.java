package com.blockout.clubs;

import com.blockout.outbox.OutboxConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@Import(OutboxConfiguration.class)
@SpringBootApplication
public class ClubsApplication {

	public static void main(String[] args) {
		SpringApplication.run(ClubsApplication.class, args);
	}
}
