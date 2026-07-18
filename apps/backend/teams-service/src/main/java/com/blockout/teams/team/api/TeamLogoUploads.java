package com.blockout.teams.team.api;

import com.blockout.teams.team.domain.TeamLogoUpload;
import java.io.IOException;
import lombok.experimental.UtilityClass;
import org.springframework.web.multipart.MultipartFile;

@UtilityClass
public class TeamLogoUploads {

    public static TeamLogoUpload from(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return null;
        }
        try {
            return new TeamLogoUpload(image.getOriginalFilename(), image.getContentType(), image.getBytes());
        } catch (IOException exception) {
            throw new RuntimeException("Échec de la lecture de l’image", exception);
        }
    }
}
