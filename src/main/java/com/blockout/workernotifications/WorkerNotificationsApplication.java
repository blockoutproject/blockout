package com.blockout.workernotifications;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class WorkerNotificationsApplication {

	public static void main(String[] args) {
		SpringApplication.run(WorkerNotificationsApplication.class, args);
	}
}
