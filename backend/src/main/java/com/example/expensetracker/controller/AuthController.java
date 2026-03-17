package com.example.expensetracker.controller;

import com.example.expensetracker.entity.Users;
import com.example.expensetracker.repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private UserRepo userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Users users) {
        // imperative method 
        if (userRepo.findByUsername(users.getUsername()).isPresent()) {
            return new ResponseEntity<> ("Username is already taken!", HttpStatus.BAD_REQUEST);
        } else {
            users.setPassword(passwordEncoder.encode(users.getPassword()));
            userRepo.save(users);
            return new ResponseEntity<> ("User registered successfully!", HttpStatus.OK);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Users users) {
        // functional method
        return userRepo.findByUsername(users.getUsername())
            .map(u -> new ResponseEntity<>("Login check successful", HttpStatus.OK))
            .orElse(new ResponseEntity<>("User not found", HttpStatus.UNAUTHORIZED));
    }
}
