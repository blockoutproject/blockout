import { ImageSourcePropType } from "react-native";

export type OnboardingVisual = {
    /** Image statique (png/svg via png) – ex: logo */
    image?: ImageSourcePropType | { uri: string };
    /** GIF animé (local `require` ou distant `uri`) */
    gif?: ImageSourcePropType | { uri: string };
    /** Ou un composant custom (ex: Lottie) */
    component?: React.ReactNode;
};

export type OnboardingStep = {
    id: string;
    title: string;
    description: string;
    visual: OnboardingVisual;
    /** Couleur de fond interpolée entre les écrans */
    bg: string;
};

// Exemple de steps
export const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: "intro",
        title: "👋 Bienvenue sur Blockout",
        description:
            "Consulte les scores et les classements, suis tes équipes, pools et clubs.",
        visual: {
            image: require("@/assets/images/hello.gif"), // ← ton logo
        },
        bg: "#0e0f13",
    },
    {
        id: "push",
        title: "⚡️ Ne rate plus aucun résultat",
        description:
            "Active les notifications pour recevoir tes résultats dès qu'ils sont disponibles.",
        visual: {
            gif: require("@/assets/images/notifications.gif"),
        },
        bg: "#111827",
    },
    {
        id: "advice",
        title: "📢 Aide-nous à améliorer Blockout",
        description:
            "Les données viennent de la Fédération Française de Volley et peuvent parfois contenir des erreurs. Grâce au bouton avec le drapeau (en haut à droite), tu peux signaler un souci et participer à rendre l’app plus fiable et utile pour tous.",
        visual: {
            image: require("@/assets/images/flag.png"),
        },
        bg: "#0e0f13",
    },
    {
        id: "start",
        title: "🚀 C’est parti",
        description:
            "Commence par rechercher une équipe ou une poule, puis suis-les pour voir les premiers matchs apparaître.",
        visual: {
            gif: require("@/assets/images/ready.gif"),
        },
        bg: "#101418",
    },
];