package com.blooddonar.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "organ_donors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganDonor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private java.util.UUID userId;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String organs; // Comma-separated list of organs (e.g., "Kidneys, Liver")

    private Double latitude;
    private Double longitude;

    @Builder.Default
    @Column(name = "is_available")
    private Boolean isAvailable = true;

    private String city;
    private String state;
}
