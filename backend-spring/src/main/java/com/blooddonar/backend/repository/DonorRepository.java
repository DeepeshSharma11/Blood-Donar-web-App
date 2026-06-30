package com.blooddonar.backend.repository;

import com.blooddonar.backend.model.Donor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DonorRepository extends JpaRepository<Donor, Long> {
    List<Donor> findByBloodGroupAndIsAvailableTrue(String bloodGroup);
    List<Donor> findByCityIgnoreCaseAndIsAvailableTrue(String city);
    List<Donor> findByBloodGroupAndCityIgnoreCaseAndIsAvailableTrue(String bloodGroup, String city);
}
