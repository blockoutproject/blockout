package com.blockout.clubs.club.event.inbound;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegacyClubDeactivationEvent implements Serializable {
    private String clubId;
}
