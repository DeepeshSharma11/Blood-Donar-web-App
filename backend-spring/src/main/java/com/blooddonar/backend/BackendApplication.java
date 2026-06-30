package com.blooddonar.backend;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        try {
            // Load .env properties and expose them as System variables
            Dotenv dotenv = Dotenv.configure()
                    .ignoreIfMissing()
                    .load();
            dotenv.entries().forEach(entry -> {
                System.setProperty(entry.getKey(), entry.getValue());
            });
        } catch (Exception e) {
            System.err.println("Could not load .env file configurations: " + e.getMessage());
        }

        SpringApplication.run(BackendApplication.class, args);
    }
}
