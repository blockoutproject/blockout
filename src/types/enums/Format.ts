export enum EnumFormat {
    SIX = "SIX",
    FOUR = "FOUR",
};

export const FormatLabels: Record<EnumFormat, string> = {
    [EnumFormat.SIX]: '6x6',
    [EnumFormat.FOUR]: '4x4',
};