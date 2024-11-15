package com.blockout.users.controllers;

import com.auth0.json.mgmt.users.User;
import com.blockout.users.services.UserService;
import com.auth0.exception.Auth0Exception;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    // 1. Endpoint to create a user
    @PostMapping
    public ResponseEntity<User> createUser(@RequestParam String email, @RequestParam String password) throws Auth0Exception {
        User user = userService.createUser(email, password);
        return ResponseEntity.ok(user);
    }

    // 2. Endpoint to get a user by ID
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) throws Auth0Exception {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    // 3. Endpoint to update a user
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable String id, @RequestBody User updatedUser) throws Auth0Exception {
        User user = userService.updateUser(id, updatedUser);
        return ResponseEntity.ok(user);
    }

    // 4. Endpoint to delete a user
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) throws Auth0Exception {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}