import { EnumScraperName } from './enums/ScraperName';

/** Administration view of one scraper enablement switch. */
export interface ScraperStatus {
  name: EnumScraperName;
  enabled: boolean;
}
