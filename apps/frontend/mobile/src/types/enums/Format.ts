export enum EnumFormat {
    SIX = "SIX",
    FOUR = "FOUR",
    TWO = "TWO"
};

export const FormatLabels: Record<EnumFormat, string> = {
    [EnumFormat.SIX]: '6x6',
    [EnumFormat.FOUR]: '4x4',
    [EnumFormat.TWO]: '2x2',
};