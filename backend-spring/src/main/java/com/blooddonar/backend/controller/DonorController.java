package com.blooddonar.backend.controller;

import com.blooddonar.backend.model.Donor;
import com.blooddonar.backend.model.OrganDonor;
import com.blooddonar.backend.repository.DonorRepository;
import com.blooddonar.backend.repository.OrganDonorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/donors")
@CrossOrigin(origins = "*") // In production, limit to Next.js origin
public class DonorController {

    @Autowired
    private DonorRepository donorRepository;

    @Autowired
    private OrganDonorRepository organDonorRepository;

    @PostMapping("/register")
    public ResponseEntity<Donor> registerDonor(@RequestBody Donor donor) {
        if (donor.getIsAvailable() == null) {
            donor.setIsAvailable(true);
        }
        Donor savedDonor = donorRepository.save(donor);
        return ResponseEntity.ok(savedDonor);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Donor>> searchDonors(
            @RequestParam(required = false) String bloodGroup,
            @RequestParam(required = false) String city) {
        
        if (bloodGroup != null && city != null) {
            return ResponseEntity.ok(donorRepository.findByBloodGroupAndCityIgnoreCaseAndIsAvailableTrue(bloodGroup, city));
        } else if (bloodGroup != null) {
            return ResponseEntity.ok(donorRepository.findByBloodGroupAndIsAvailableTrue(bloodGroup));
        } else if (city != null) {
            return ResponseEntity.ok(donorRepository.findByCityIgnoreCaseAndIsAvailableTrue(city));
        } else {
            return ResponseEntity.ok(donorRepository.findAll());
        }
    }

    @PutMapping("/{id}/availability")
    public ResponseEntity<Donor> toggleAvailability(
            @PathVariable Long id,
            @RequestParam boolean available) {
        return donorRepository.findById(id)
                .map(donor -> {
                    donor.setIsAvailable(available);
                    Donor updated = donorRepository.save(donor);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // --- Organ Donation Endpoints ---

    @PostMapping("/organ/register")
    public ResponseEntity<OrganDonor> registerOrganDonor(@RequestBody OrganDonor donor) {
        if (donor.getIsAvailable() == null) {
            donor.setIsAvailable(true);
        }
        if (donor.getUserId() != null) {
            Optional<OrganDonor> existing = organDonorRepository.findByUserId(donor.getUserId());
            if (existing.isPresent()) {
                OrganDonor toUpdate = existing.get();
                toUpdate.setName(donor.getName());
                toUpdate.setPhone(donor.getPhone());
                toUpdate.setOrgans(donor.getOrgans());
                toUpdate.setCity(donor.getCity());
                toUpdate.setState(donor.getState());
                toUpdate.setLatitude(donor.getLatitude());
                toUpdate.setLongitude(donor.getLongitude());
                toUpdate.setIsAvailable(donor.getIsAvailable());
                return ResponseEntity.ok(organDonorRepository.save(toUpdate));
            }
        }
        OrganDonor savedDonor = organDonorRepository.save(donor);
        return ResponseEntity.ok(savedDonor);
    }

    @GetMapping("/organ/profile/{userId}")
    public ResponseEntity<OrganDonor> getOrganProfile(@PathVariable UUID userId) {
        return organDonorRepository.findByUserId(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
