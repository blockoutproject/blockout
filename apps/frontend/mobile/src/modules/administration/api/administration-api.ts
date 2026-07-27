import {
  listScraperStatuses,
  updateScraperStatus,
} from "@/src/shared/generated/endpoints/config-secure";

/** Expose scraper administration operations through the feature API boundary. */
export class AdministrationApi {
  /** Load all scraper statuses. */
  public getScraperStatuses() {
    return listScraperStatuses();
  }

  /** Enable or disable one scraper schedule. */
  public updateScraperStatus(name: string, enabled: boolean) {
    return updateScraperStatus(name, { enabled });
  }
}
