"use client";

import { Box } from "@chakra-ui/react";
import { ChatPanel } from "@/components/ChatPanel";
import { useColors } from "@/theme/useColors";

export default function ChatPopout() {
  const c = useColors();
  return (
    <Box h="100vh" bg={c.surface} color={c.text.primary} overflow="hidden">
      <ChatPanel />
    </Box>
  );
}
