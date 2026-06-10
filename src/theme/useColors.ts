"use client";

import { useColorMode } from "@chakra-ui/react";
import colors from "./colors";

export function useColors() {
  const { colorMode } = useColorMode();
  return colors(colorMode === "dark");
}
