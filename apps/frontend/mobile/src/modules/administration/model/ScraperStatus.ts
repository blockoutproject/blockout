import {EnumScraperName} from "@/src/shared/model/enums/ScraperName";

export interface ScraperStatusResponse {
  id: number;
  name: EnumScraperName;
  enabled: boolean;
  lastUpdate: string;
}
