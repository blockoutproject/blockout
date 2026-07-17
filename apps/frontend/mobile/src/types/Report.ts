export enum ReportType {
  DISPLAY_BUG = 'DISPLAY_BUG',
  DATA_ERROR = 'DATA_ERROR',
  LOGO = 'LOGO',
  LIVE = 'LIVE',
  OTHER = 'OTHER',
}

export interface ReportCreatedView {
  number: number;
  htmlUrl: string;
  title: string;
}
