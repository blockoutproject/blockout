package com.blockout.users.controllers.v1;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.blockout.users.services.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/internal/users")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserService userService;

    @PostMapping("/{auth0Id}/assign-default-role")
    public ResponseEntity<Void> assignDefaultRole(@PathVariable String auth0Id) {
        userService.assignDefaultRole(auth0Id);
        return ResponseEntity.noContent().build();
    }
}