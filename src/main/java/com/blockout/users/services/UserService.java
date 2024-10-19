package com.blockout.users.services;

import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.json.mgmt.users.User;
import com.auth0.net.Request;
import com.blockout.users.exceptions.custom.InternalServerErrorException;
import com.auth0.exception.Auth0Exception;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final ManagementAPI managementAPI;

    @Autowired
    public UserService(ManagementAPI managementAPI) {
        this.managementAPI = managementAPI;
    }

    // 1. Create a user
    public User createUser(String email, String password) throws Auth0Exception {
        User user = new User("Username-Password-Authentication");
        user.setEmail(email);
        user.setPassword(password.toCharArray());

        try {
            return managementAPI.users().create(user).execute().getBody();
        } catch (Auth0Exception e) {
            // Allow Auth0 exceptions to propagate
            throw e;
        } catch (Exception e) {
            // Handle any other unexpected exceptions
            throw new InternalServerErrorException("Unexpected error while creating user: " + e.getMessage());
        }
    }

    // 2. Retrieve a user by ID
    public User getUserById(String userId) throws Auth0Exception {
        try {
            Request<User> request = managementAPI.users().get(userId, null);
            return request.execute().getBody();
        } catch (Auth0Exception e) {
            // Allow Auth0 exceptions to propagate
            throw e;
        } catch (Exception e) {
            // Handle any other unexpected exceptions
            throw new InternalServerErrorException("Unexpected error while fetching user: " + e.getMessage());
        }
    }

    // 3. Update a user
    public User updateUser(String userId, User updatedUser) throws Auth0Exception {
        try {
            Request<User> request = managementAPI.users().update(userId, updatedUser);
            return request.execute().getBody();
        } catch (Auth0Exception e) {
            // Allow Auth0 exceptions to propagate
            throw e;
        } catch (Exception e) {
            // Handle any other unexpected exceptions
            throw new InternalServerErrorException("Unexpected error while updating user: " + e.getMessage());
        }
    }

    // 4. Delete a user
    public void deleteUser(String userId) throws Auth0Exception {
        try {
            managementAPI.users().delete(userId).execute();
        } catch (Auth0Exception e) {
            // Allow Auth0 exceptions to propagate
            throw e;
        } catch (Exception e) {
            // Handle any other unexpected exceptions
            throw new InternalServerErrorException("Unexpected error while deleting user: " + e.getMessage());
        }
    }
}