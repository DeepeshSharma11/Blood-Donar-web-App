package com.blooddonar.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "donors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Donor {

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

    @Column(name = "blood_group", nullable = false)
    private String bloodGroup;

    private Double latitude;
    private Double longitude;

    @Builder.Default
    @Column(name = "is_available")
    private Boolean isAvailable = true;

    @Column(name = "last_donation_date")
    private LocalDate lastDonationDate;

    private String city;
    private String state;
}
