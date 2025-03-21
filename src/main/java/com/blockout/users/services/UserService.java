package com.blockout.users.services;

import com.blockout.users.models.User;
import com.blockout.users.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserService {
    
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    
    @Autowired
    private UserRepository userRepository;

    /**
     * Récupère un utilisateur par son ID Auth0
     * @param auth0Id L'identifiant Auth0 de l'utilisateur
     * @return Optional contenant l'utilisateur s'il existe
     */
    public Optional<User> getUserByAuth0Id(String auth0Id) {
        logger.info("Récupération de l'utilisateur avec l'ID Auth0",
                keyValue("action", "get_user_by_auth0_id"),
                keyValue("auth0Id", auth0Id));
        return userRepository.findByAuth0Id(auth0Id);
    }

    /**
     * Enregistre un nouvel utilisateur
     * @param user L'utilisateur à enregistrer
     * @return L'utilisateur enregistré avec son ID généré
     */
    @Transactional
    public User registerUser(User user) {
        logger.info("Enregistrement d'un nouvel utilisateur",
                keyValue("action", "register_user"),
                keyValue("email", user.getEmail()));
        
        // Vérifier si l'utilisateur existe déjà
        if (user.getAuth0Id() != null) {
            Optional<User> existingUser = userRepository.findByAuth0Id(user.getAuth0Id());
            if (existingUser.isPresent()) {
                logger.warn("Un utilisateur avec cet ID Auth0 existe déjà",
                        keyValue("action", "register_user"),
                        keyValue("auth0Id", user.getAuth0Id()));
                return existingUser.get();
            }
        }
        
        // Définir les dates de création
        LocalDateTime now = LocalDateTime.now();
        user.setCreatedAt(now);
        user.setLastUpdate(now);
        
        // Enregistrer l'utilisateur
        User createdUser = userRepository.save(user);
        logger.info("Utilisateur créé avec succès",
                keyValue("action", "register_user"),
                keyValue("userId", createdUser.getId()));
        
        return createdUser;
    }
}