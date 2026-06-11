export interface ShowConfig {
  title: string;
  subtitle: string;
}

let showConfig: ShowConfig = {
  title: process.env.SHOW_TITLE || "Greg Osuri & Mayne: Market Bubble EP 4",
  subtitle: process.env.SHOW_SUBTITLE || "THURSDAY 1PM PST · PRESENTED BY POLYMARKET",
};

export function getShow(): ShowConfig {
  return showConfig;
}

export function setShow(next: { title?: unknown; subtitle?: unknown }): ShowConfig {
  showConfig = {
    title: typeof next.title === "string" && next.title.trim() ? next.title.trim() : showConfig.title,
    subtitle: typeof next.subtitle === "string" ? next.subtitle.trim() : showConfig.subtitle,
  };
  return showConfig;
}
