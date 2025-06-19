from enum import Enum


class DivisionCode(Enum):
    MSL = "MSL"
    SP6 = "SP6"
    LBM = "LBM"
    ELITE = "ELITE"
    ELITEAVENIR = "ELITEAVENIR"
    N2 = "N2"
    N3 = "N3"
    PRENAT = "PRENAT"
    REG = "REG"
    M21 = "M21"
    M18 = "M18"
    M15 = "M15"
    M13 = "M13"
    M11 = "M11"
    OTHER = "OTHER"


DIVISION_CODE_LABELS: dict[DivisionCode, str] = {
    DivisionCode.MSL: "Marmara SpikeLigue",
    DivisionCode.SP6: "Saforelle Power 6",
    DivisionCode.LBM: "Ligue B Masculine",
    DivisionCode.ELITE: "Élite",
    DivisionCode.ELITEAVENIR: "Élite Avenir",
    DivisionCode.N2: "Nationale 2",
    DivisionCode.N3: "Nationale 3",
    DivisionCode.PRENAT: "Prénationale",
    DivisionCode.REG: "Régionale",
    DivisionCode.M21: "M21",
    DivisionCode.M18: "M18",
    DivisionCode.M15: "M15",
    DivisionCode.M13: "M13",
    DivisionCode.M11: "M11",
    DivisionCode.OTHER: "Division inconnue",
}