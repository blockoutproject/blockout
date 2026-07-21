import {EnumScraperName} from "@/src/types/enums/ScraperName";

export interface ScraperStatusResponse {
  id: number;
  name: EnumScraperName;
  enabled: boolean;
  lastUpdate: string;
}
