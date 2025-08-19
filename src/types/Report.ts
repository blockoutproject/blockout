export enum ReportType {
    DISPLAY_BUG = 'DISPLAY_BUG',
    DATA_ERROR = 'DATA_ERROR',
    OTHER = 'OTHER',
}

export interface DisplayBug {
    screen: string;
    deviceModel?: string;
    os?: string;
    stepsToReproduce?: string;
    expected?: string;
    actual?: string;
    uiTheme?: string;
    viewport?: string;
}

export interface DataError {
    reference: string;
    field?: string;
    currentValue?: string;
    expectedValue?: string;
    sourceLink?: string;
    context?: string;
}

export interface Report {
    type: ReportType;
    title: string;
    description?: string;
    appVersion?: string;
    locale?: string;
    userId?: string;
    environment?: string;
    displayBug?: DisplayBug;
    dataError?: DataError;
}

export interface GitHubIssueResponse {
    id: number;
    number: number;
    htmlUrl: string;
    title: string;
    state: string;
}