import type {
  MobileScraperStatus,
  ScraperNameEnum,
} from '@/src/api/generated/mobile-gateway/models';
import type { ScraperStatus } from '@/src/types/ScraperStatus';
import { EnumScraperName } from '@/src/types/enums/ScraperName';

const scraperNameViewByWire: Record<ScraperNameEnum, EnumScraperName> = {
  SCRAPER: EnumScraperName.SCRAPER,
  SCRAPER_CLUBS: EnumScraperName.SCRAPER_CLUBS,
};

/**
 * Projects a canonical scraper switch into the existing administration view.
 *
 * @param response - Validated mobile scraper-status response.
 * @returns Scraper status with the existing mobile enum identity.
 */
export function toScraperStatusView(
  response: MobileScraperStatus,
): ScraperStatus {
  return {
    name: scraperNameViewByWire[response.name],
    enabled: response.enabled,
  };
}
