export enum ReportType {
  DISPLAY_BUG = "DISPLAY_BUG",
  DATA_ERROR = "DATA_ERROR",
  LOGO = "LOGO",
  LIVE = "LIVE",
  OTHER = "OTHER",
}

export type CreateReportRequest = {
  type: ReportType;
  title: string;
  description?: string;
  appVersion?: string;
  userId?: string;
  userName?: string;
  screen: string;
  deviceModel?: string;
  os?: string;
};

export type ReportResponse = {
  id: number;
  number: number;
  htmlUrl: string;
  title: string;
  state: string;
};
