export enum EnumGender {
    M = "M",
    F = "F",
    O = "O",
};

export const GenderLabels: Record<EnumGender, string> = {
    [EnumGender.M]: 'Masculin',
    [EnumGender.F]: 'Féminin',
    [EnumGender.O]: 'Mixte / Autre',
};