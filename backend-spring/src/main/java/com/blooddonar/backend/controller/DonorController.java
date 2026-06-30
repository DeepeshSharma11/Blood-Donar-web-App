package com.blooddonar.backend.controller;

import com.blooddonar.backend.model.Donor;
import com.blooddonar.backend.repository.DonorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/donors")
@CrossOrigin(origins = "*") // In production, limit to Next.js origin
public class DonorController {

    @Autowired
    private DonorRepository donorRepository;

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
}
