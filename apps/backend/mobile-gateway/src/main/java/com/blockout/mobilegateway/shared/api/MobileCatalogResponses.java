package com.blockout.mobilegateway.shared.api;

import com.blockout.mobilegateway.generated.model.MobileCatalogDivision;
import com.blockout.mobilegateway.generated.model.MobileRankingTeam;
import com.blockout.mobilegateway.shared.application.MobileCatalogDivisionView;
import com.blockout.mobilegateway.shared.application.MobileRankingTeamView;

/** Maps shared workflow projections at the generated mobile API edge. */
public final class MobileCatalogResponses {

    private MobileCatalogResponses() {
    }

    public static MobileCatalogDivision division(MobileCatalogDivisionView value) {
        if (value == null) {
            return null;
        }
        return new MobileCatalogDivision(value.name(), value.mainColor(), value.firstGradientColor(),
                value.secondGradientColor(), value.thirdGradientColor(), value.logoUrl());
    }

    public static MobileRankingTeam ranking(MobileRankingTeamView value) {
        return new MobileRankingTeam(value.id(), value.shortName(), value.logoUrl(), value.points(), value.played(),
                value.wins(), value.losses(), value.latitude(), value.longitude());
    }
}
