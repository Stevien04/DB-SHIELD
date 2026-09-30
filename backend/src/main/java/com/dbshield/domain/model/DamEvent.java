package com.dbshield.domain.model;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
@Data @Builder
public class DamEvent {
    private Long databaseId;
    private String username;
    private String clientAddress;
    private String state;
    private String query;
    private double durationSeconds;
    private LocalDateTime eventTime;
}
