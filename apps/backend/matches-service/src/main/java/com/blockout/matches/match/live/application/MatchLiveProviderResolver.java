package com.blockout.matches.match.live.application;

import com.blockout.shared.model.LiveProviderEnum;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class MatchLiveProviderResolver {

    private static final String[] YOUTUBE_HOSTS = {"youtube.com", "youtu.be"};
    private static final String[] TWITCH_HOSTS = {"twitch.tv"};
    private static final String[] FACEBOOK_HOSTS = {"facebook.com", "fb.com", "fb.watch"};

    public LiveProviderEnum resolve(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("Le lien du live est requis.");
        }
        try {
            URI uri = new URI(url);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (host.isBlank()) {
                throw new IllegalArgumentException("URL invalide.");
            }
            if (matchesHost(host, YOUTUBE_HOSTS)) {
                return LiveProviderEnum.YOUTUBE;
            }
            if (matchesHost(host, TWITCH_HOSTS)) {
                return LiveProviderEnum.TWITCH;
            }
            if (matchesHost(host, FACEBOOK_HOSTS)) {
                return LiveProviderEnum.FACEBOOK;
            }
            throw new IllegalArgumentException("Seuls les liens YouTube, Twitch ou Facebook sont acceptés.");
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("URL invalide.", exception);
        }
    }

    private boolean matchesHost(String host, String[] bases) {
        for (String base : bases) {
            if (host.equals(base) || host.endsWith("." + base)) {
                return true;
            }
        }
        return false;
    }
}
