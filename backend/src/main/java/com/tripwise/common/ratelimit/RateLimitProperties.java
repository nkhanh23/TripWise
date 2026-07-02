package com.tripwise.common.ratelimit;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@Getter
@Setter
@ConfigurationProperties(prefix = "tripwise.rate-limit")
public class RateLimitProperties {

    private boolean enabled = true;
    private Rule login = new Rule(5, Duration.ofMinutes(1));
    private Rule register = new Rule(3, Duration.ofMinutes(1));

    @Getter
    @Setter
    public static class Rule {
        private long capacity;
        private Duration window;

        public Rule() {
        }

        public Rule(long capacity, Duration window) {
            this.capacity = capacity;
            this.window = window;
        }
    }
}
