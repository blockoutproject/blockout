export interface CustomTheme {
    dark: boolean;
    colors: {
        background: string;
        text: string;
        primary: string;
        card: string;
        border: string;
        notification: string;
        custom: {
            surface: string;
            icon: string;
            active: string;
            inactive: string;
            tint: string;
            tabIconDefault: string;
            tabIconSelected: string;
            green: string;
            red: string;
            yellow: string;
            hover: string;
            pressed: string;
        };
    };
}