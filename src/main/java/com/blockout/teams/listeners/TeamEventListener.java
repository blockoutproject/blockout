package com.blockout.teams.listeners;

import com.blockout.teams.services.TeamService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.blockout.teams.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TeamEventListener {

    @Autowired
    private TeamService teamService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @RabbitListener(queues = RabbitMQConfig.TEAM_EVENT_QUEUE)
    public void handleTeamEvent(String message) {
        try {
            JsonNode eventNode = objectMapper.readTree(message);
            String eventType = eventNode.get("eventType").asText();

            if ("TeamDeactivated".equals(eventType)) {
                JsonNode teamNode = eventNode.get("team");
                Long teamlId = teamNode.get("id").asLong();

                teamService.deactivateTeam(teamlId);
            }
        } catch (Exception e) {
            // Gérer les exceptions, éventuellement logger l'erreur
            e.printStackTrace();
        }
    }
}