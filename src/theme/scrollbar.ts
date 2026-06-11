import colors from "./colors";

type Colors = ReturnType<typeof colors>;

export function scrollbarSx(c: Colors) {
  return {
    scrollbarWidth: "thin" as const,
    scrollbarColor: `${c.overlay.strong} transparent`,
    "&::-webkit-scrollbar": { width: "7px", height: "7px" },
    "&::-webkit-scrollbar-thumb": { background: c.overlay.strong, borderRadius: "4px" },
    "&::-webkit-scrollbar-thumb:hover": { background: c.border.strong },
    "&::-webkit-scrollbar-track": { background: "transparent" },
  };
}
