const palette = {
  dark: {
    bg: "#0b0b0b",
    surface: "#151515",
    surfaceLight: "#1c1c1c",
    surfaceRaised: "#222222",
  },
  light: {
    bg: "#f5f4eb",
    surface: "#faf9f1",
    surfaceLight: "#fdfcf7",
    surfaceRaised: "#ffffff",
  },

  darkText: {
    primary: "#fefefe",
    secondary: "#b4b4b4",
    muted: "#8a8a8a",
    subtle: "#6a6a6a",
    placeholder: "#4a4a4a",
  },
  lightText: {
    primary: "#0b0b0b",
    secondary: "#3a3a3a",
    muted: "#6f6f6f",
    subtle: "#9a978f",
    placeholder: "#c9c6bd",
  },

  darkBorder: {
    subtle: "rgba(255,255,255,0.07)",
    default: "rgba(255,255,255,0.11)",
    strong: "rgba(255,255,255,0.2)",
  },
  lightBorder: {
    subtle: "rgba(0,0,0,0.08)",
    default: "rgba(0,0,0,0.12)",
    strong: "rgba(0,0,0,0.2)",
  },

  darkOverlay: {
    subtle: "rgba(255,255,255,0.02)",
    soft: "rgba(255,255,255,0.04)",
    hover: "rgba(255,255,255,0.06)",
    strong: "rgba(255,255,255,0.1)",
  },
  lightOverlay: {
    subtle: "rgba(0,0,0,0.02)",
    soft: "rgba(0,0,0,0.04)",
    hover: "rgba(0,0,0,0.06)",
    strong: "rgba(0,0,0,0.1)",
  },

  brand: {
    red: "#c8463a",
    green: "#2f9e6a",
    gold: "#c79a3f",
    ink: "#0b0b0b",
    paper: "#f6f4ee",
  },

  platform: {
    twitch: "#9146ff",
    kick: "#53fc18",
    x: "#e7e9ea",
  },

  streamer: {
    banks: "#c79a3f",
    ansem: "#c8463a",
  },

  live: "#e0322a",

  darkSelection: "rgba(255,255,255,0.16)",
  lightSelection: "rgba(0,0,0,0.12)",
};

export function colors(isDark: boolean) {
  return {
    bg: isDark ? palette.dark.bg : palette.light.bg,
    surface: isDark ? palette.dark.surface : palette.light.surface,
    surfaceLight: isDark ? palette.dark.surfaceLight : palette.light.surfaceLight,
    surfaceRaised: isDark ? palette.dark.surfaceRaised : palette.light.surfaceRaised,

    text: {
      primary: isDark ? palette.darkText.primary : palette.lightText.primary,
      secondary: isDark ? palette.darkText.secondary : palette.lightText.secondary,
      muted: isDark ? palette.darkText.muted : palette.lightText.muted,
      subtle: isDark ? palette.darkText.subtle : palette.lightText.subtle,
      placeholder: isDark ? palette.darkText.placeholder : palette.lightText.placeholder,
    },

    border: {
      subtle: isDark ? palette.darkBorder.subtle : palette.lightBorder.subtle,
      default: isDark ? palette.darkBorder.default : palette.lightBorder.default,
      strong: isDark ? palette.darkBorder.strong : palette.lightBorder.strong,
    },

    overlay: {
      subtle: isDark ? palette.darkOverlay.subtle : palette.lightOverlay.subtle,
      soft: isDark ? palette.darkOverlay.soft : palette.lightOverlay.soft,
      hover: isDark ? palette.darkOverlay.hover : palette.lightOverlay.hover,
      strong: isDark ? palette.darkOverlay.strong : palette.lightOverlay.strong,
    },

    brand: palette.brand,
    platform: {
      twitch: palette.platform.twitch,
      kick: palette.platform.kick,
      x: isDark ? palette.platform.x : "#0b0b0b",
    },
    streamer: palette.streamer,
    live: palette.live,
    selection: isDark ? palette.darkSelection : palette.lightSelection,

    shadow: {
      panel: isDark ? "0 24px 60px rgba(0,0,0,0.5)" : "0 24px 60px rgba(0,0,0,0.1)",
      soft: isDark ? "0 12px 32px rgba(0,0,0,0.35)" : "0 12px 32px rgba(0,0,0,0.07)",
    },
    radius: {
      panel: "22px",
      card: "16px",
      control: "12px",
      pill: "999px",
    },
  };
}

export { palette };
export default colors;
