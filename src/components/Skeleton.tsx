"use client";

import { Box, type BoxProps } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useSettings } from "@/lib/settings";
import { useColors } from "@/theme/useColors";

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

export function Skel({
  w,
  h = "1em",
  rounded = "6px",
  ...rest
}: { w?: BoxProps["w"]; h?: BoxProps["h"]; rounded?: BoxProps["borderRadius"] } & BoxProps) {
  const c = useColors();
  const { reduceMotion } = useSettings();
  return (
    <Box
      w={w}
      h={h}
      borderRadius={rounded}
      flexShrink={0}
      bg={c.overlay.soft}
      sx={{
        backgroundImage: `linear-gradient(90deg, ${c.overlay.soft} 25%, ${c.overlay.hover} 50%, ${c.overlay.soft} 75%)`,
        backgroundSize: "200% 100%",
        animation: reduceMotion ? undefined : `${shimmer} 1.5s ease-in-out infinite`,
      }}
      {...rest}
    />
  );
}
