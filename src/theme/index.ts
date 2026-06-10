import { extendTheme, type ThemeConfig } from "@chakra-ui/react";
import { palette } from "./colors";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  breakpoints: {
    sm: "30em",
    md: "48em",
    lg: "62em",
    xl: "80em",
    "2xl": "96em",
    stats: "129.06em",
  },
  fontSizes: {
    "2xs": "11px",
    xs: "12px",
    sm: "13px",
    md: "14px",
    lg: "15px",
    xl: "17px",
    "2xl": "19px",
    "3xl": "22px",
    "4xl": "28px",
    "5xl": "36px",
    "6xl": "46px",
    "7xl": "58px",
  },
  fonts: {
    heading: `var(--font-display), Georgia, "Times New Roman", serif`,
    body: `var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    mono: `var(--font-geist-mono), ui-monospace, "SF Mono", Menlo, Monaco, monospace`,
  },
  semanticTokens: {
    colors: {
      "mb.bg": { default: palette.light.bg, _dark: palette.dark.bg },
      "mb.surface": { default: palette.light.surface, _dark: palette.dark.surface },
      "mb.surfaceLight": { default: palette.light.surfaceLight, _dark: palette.dark.surfaceLight },
      "mb.surfaceRaised": { default: palette.light.surfaceRaised, _dark: palette.dark.surfaceRaised },
      "mb.text.primary": { default: palette.lightText.primary, _dark: palette.darkText.primary },
      "mb.text.secondary": { default: palette.lightText.secondary, _dark: palette.darkText.secondary },
      "mb.text.muted": { default: palette.lightText.muted, _dark: palette.darkText.muted },
      "mb.text.subtle": { default: palette.lightText.subtle, _dark: palette.darkText.subtle },
      "mb.border.subtle": { default: palette.lightBorder.subtle, _dark: palette.darkBorder.subtle },
      "mb.border.default": { default: palette.lightBorder.default, _dark: palette.darkBorder.default },
      "mb.border.strong": { default: palette.lightBorder.strong, _dark: palette.darkBorder.strong },
      "mb.overlay.hover": { default: palette.lightOverlay.hover, _dark: palette.darkOverlay.hover },
      "mb.brand.red": { default: palette.brand.red, _dark: palette.brand.red },
      "mb.brand.green": { default: palette.brand.green, _dark: palette.brand.green },
      "mb.brand.gold": { default: palette.brand.gold, _dark: palette.brand.gold },
      "mb.live": { default: palette.live, _dark: palette.live },
    },
  },
  styles: {
    global: (props: { colorMode: string }) => ({
      "html, body": {
        bg: props.colorMode === "dark" ? palette.dark.bg : palette.light.bg,
        color: props.colorMode === "dark" ? palette.darkText.primary : palette.lightText.primary,
      },
      "#__next": {
        height: "100%",
      },
      "::selection": {
        bg: props.colorMode === "dark" ? palette.darkSelection : palette.lightSelection,
      },
      "::-webkit-scrollbar": {
        width: "10px",
        height: "10px",
      },
      "::-webkit-scrollbar-track": {
        background: "transparent",
      },
      "::-webkit-scrollbar-thumb": {
        background: props.colorMode === "dark" ? palette.darkBorder.default : palette.lightBorder.default,
        borderRadius: "8px",
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 600,
        borderRadius: "10px",
      },
    },
  },
});

export default theme;
