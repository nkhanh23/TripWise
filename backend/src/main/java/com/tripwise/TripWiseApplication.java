package com.tripwise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TripWiseApplication {

    public static void main(String[] args) {
        SpringApplication.run(TripWiseApplication.class, args);
    }
}
