import { EnumScraperName } from "./enums/ScraperName";

export interface ScraperStatus {
    id: number;
    name: EnumScraperName;
    enabled: boolean;
    lastUpdate: string;
}