package com.blooddonar.backend.repository;

import com.blooddonar.backend.model.OrganDonor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface OrganDonorRepository extends JpaRepository<OrganDonor, Long> {
    Optional<OrganDonor> findByUserId(UUID userId);
}
